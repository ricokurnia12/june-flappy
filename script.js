var ctx = myCanvas.getContext("2d");
var FPS = 40;
var jump_amount = -10;
var max_fall_speed = +10;
var acceleration = 1;
var pipe_speed = -2;
var game_mode = "character_select"; // <-- Diubah: Status awal sekarang adalah pemilihan karakter
var time_game_last_running;
var bottom_bar_offset = 0;
var pipes = [];
var bird; // <-- Diubah: Bird akan diinisialisasi setelah pemilihan
var selected_bird_src = ""; // <-- BARU: Untuk menyimpan sumber gambar burung yang dipilih

// +++ BARU: Fungsi untuk mendapatkan posisi mouse/sentuhan di canvas +++
function get_mouse_pos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width / rect.width;    // Skala X (jika canvas di-resize)
  var scaleY = canvas.height / rect.height;  // Skala Y (jika canvas di-resize)

  if (evt.touches && evt.touches.length > 0) {
      return {
          x: (evt.touches[0].clientX - rect.left) * scaleX,
          y: (evt.touches[0].clientY - rect.top) * scaleY
      };
  } else if (evt.clientX !== undefined) {
       return {
          x: (evt.clientX - rect.left) * scaleX,
          y: (evt.clientY - rect.top) * scaleY
      };
  }
  return {x: 0, y: 0}; // Fallback
}

// +++ BARU: Fungsi untuk memeriksa apakah titik berada di dalam persegi panjang +++
function is_inside(pos, rect) {
  return pos.x > rect.x && pos.x < rect.x + rect.width && pos.y < rect.y + rect.height && pos.y > rect.y;
}

function MySprite(img_url) {
  this.x = 0;
  this.y = 0;
  this.visible = true;
  this.velocity_x = 0;
  this.velocity_y = 0;
  this.MyImg = new Image();
  this.MyImg.src = img_url || "";
  this.angle = 0;
  this.flipV = false;
  this.flipH = false;
}

MySprite.prototype.Do_Frame_Things = function () {
  ctx.save();
  ctx.translate(this.x + this.MyImg.width / 2, this.y + this.MyImg.height / 2);
  ctx.rotate((this.angle * Math.PI) / 180);
  if (this.flipV) ctx.scale(1, -1);
  if (this.flipH) ctx.scale(-1, 1);
  if (this.visible)
    ctx.drawImage(this.MyImg, -this.MyImg.width / 2, -this.MyImg.height / 2);
  this.x = this.x + this.velocity_x;
  this.y = this.y + this.velocity_y;
  ctx.restore();
};

function ImagesTouching(thing1, thing2) {
  if (!thing1 || !thing2 || !thing1.visible || !thing2.visible) return false; // <-- Diubah: Tambah cek null
  if (
    thing1.x >= thing2.x + thing2.MyImg.width ||
    thing1.x + thing1.MyImg.width <= thing2.x
  )
    return false;
  if (
    thing1.y >= thing2.y + thing2.MyImg.height ||
    thing1.y + thing1.MyImg.height <= thing2.y
  )
    return false;
  return true;
}

// +++ BARU: Sprite untuk tampilan pemilihan karakter +++
var rico_char_select = new MySprite("./rico.png");
rico_char_select.x = 150;
rico_char_select.y = 200;

var dara_char_select = new MySprite("./dara.png");
dara_char_select.x = 400;
dara_char_select.y = 200;


// +++ BARU: Fungsi untuk mengatur permainan dengan karakter yang dipilih +++
function setup_game(bird_src) {
    selected_bird_src = bird_src;
    bird = new MySprite(selected_bird_src);
    bird.x = myCanvas.width / 3;
    bird.y = myCanvas.height / 2;
    reset_game(); // Panggil reset_game untuk mengatur posisi dan pipa
    game_mode = "prestart"; // Ubah mode ke prestart
}

// <-- Diubah: Menambahkan case untuk 'character_select' -->
function Got_Player_Input(MyEvent) {
  switch (game_mode) {
    case "character_select": {
        var pos = get_mouse_pos(myCanvas, MyEvent);

        // Tentukan area klik (sesuaikan jika ukuran gambar berbeda)
        // Gunakan ukuran tetap agar lebih aman jika gambar belum termuat
        var char_width = 60; // Lebar area klik
        var char_height = 60; // Tinggi area klik

        var rico_rect = { x: rico_char_select.x, y: rico_char_select.y, width: char_width, height: char_height };
        var dara_rect = { x: dara_char_select.x, y: dara_char_select.y, width: char_width, height: char_height };

        if (is_inside(pos, rico_rect)) {
            setup_game("./rico.png");
        } else if (is_inside(pos, dara_rect)) {
            setup_game("./dara.png");
        }
        break;
    }
    case "prestart": {
      game_mode = "running";
      break;
    }
    case "running": {
      bird.velocity_y = jump_amount;
      break;
    }
    case "over":
      if (new Date() - time_game_last_running > 1000) {
        reset_game();
        game_mode = "running";
        break;
      }
  }
  MyEvent.preventDefault();
}

addEventListener("touchstart", Got_Player_Input);
addEventListener("mousedown", Got_Player_Input);
addEventListener("keydown", Got_Player_Input);

function make_bird_slow_and_fall() {
  if (!bird) return; // <-- Diubah: Tambah cek jika bird ada
  if (bird.velocity_y < max_fall_speed) {
    bird.velocity_y = bird.velocity_y + acceleration;
  }
  if (bird.y > myCanvas.height - bird.MyImg.height) {
    bird.velocity_y = 0;
    game_mode = "over";
  }
  if (bird.y < 0 - bird.MyImg.height) {
    bird.velocity_y = 0;
    game_mode = "over";
  }
}

function add_pipe(x_pos, top_of_gap, gap_width) {
  var top_pipe = new MySprite();
  top_pipe.MyImg = pipe_piece;
  top_pipe.x = x_pos;
  top_pipe.y = top_of_gap - pipe_piece.height;
  top_pipe.velocity_x = pipe_speed;
  pipes.push(top_pipe);
  var bottom_pipe = new MySprite();
  bottom_pipe.MyImg = pipe_piece;
  bottom_pipe.flipV = true;
  bottom_pipe.x = x_pos;
  bottom_pipe.y = top_of_gap + gap_width;
  bottom_pipe.velocity_x = pipe_speed;
  pipes.push(bottom_pipe);
}

function make_bird_tilt_appropriately() {
  if (!bird) return; // <-- Diubah: Tambah cek jika bird ada
  if (bird.velocity_y < 0) {
    bird.angle = -15;
  } else if (bird.angle < 70) {
    bird.angle = bird.angle + 4;
  }
}

function show_the_pipes() {
  for (var i = 0; i < pipes.length; i++) {
    pipes[i].Do_Frame_Things();
  }
}

function check_for_end_game() {
  if (!bird) return; // <-- Diubah: Tambah cek jika bird ada
  for (var i = 0; i < pipes.length; i++)
    if (ImagesTouching(bird, pipes[i])) game_mode = "over";
}

function display_intro_instructions() {
  ctx.font = "25px Arial";
  ctx.fillStyle = "red";
  ctx.textAlign = "center";
  ctx.fillText(
    "Press, touch or click to start",
    myCanvas.width / 2,
    myCanvas.height / 4
  );
}

function display_game_over() {
  var score = 0;
  for (var i = 0; i < pipes.length; i++)
    if (pipes[i].x < bird.x) score = score + 0.5;
  ctx.font = "30px Arial";
  ctx.fillStyle = "red";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", myCanvas.width / 2, 100);
  ctx.fillText("Score: " + score, myCanvas.width / 2, 150);
  ctx.font = "20px Arial";
  ctx.fillText("Click, touch, or press to play again", myCanvas.width / 2, 300);
}

function display_bar_running_along_bottom() {
  if (bottom_bar_offset < -23) bottom_bar_offset = 0;
  ctx.drawImage(
    bottom_bar,
    bottom_bar_offset,
    myCanvas.height - bottom_bar.height
  );
}

// +++ BARU: Fungsi untuk menampilkan layar pemilihan karakter +++
function display_character_select() {
    ctx.font = "30px Pacifico";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.fillText("Choose Your Character!", myCanvas.width / 2, 100);

    // Gambar sprite karakter untuk pemilihan
    rico_char_select.Do_Frame_Things();
    dara_char_select.Do_Frame_Things();

    ctx.font = "20px Arial";
    ctx.fillStyle = "blue";
    // Gunakan posisi sprite untuk menempatkan teks nama
    var rico_w = rico_char_select.MyImg.width || 50;
    var dara_w = dara_char_select.MyImg.width || 50;
    var rico_h = rico_char_select.MyImg.height || 50;
    var dara_h = dara_char_select.MyImg.height || 50;

    ctx.fillText("Rico", rico_char_select.x + rico_w / 2, rico_char_select.y + rico_h + 30);
    ctx.fillText("dara", dara_char_select.x + dara_w / 2, dara_char_select.y + dara_h + 30);

    ctx.font = "18px Arial";
    ctx.fillStyle = "gray";
    ctx.fillText("Click on a character to select", myCanvas.width / 2, myCanvas.height - 50);
}

// <-- Diubah: Hanya reset jika bird ada, dan set velocity ke 0 -->
function reset_game() {
  if (bird) {
      bird.y = myCanvas.height / 2;
      bird.angle = 0;
      bird.velocity_y = 0; // Pastikan kecepatan awal adalah 0
  }
  pipes = []; // Hapus semua pipa
  add_all_my_pipes(); // Tambahkan pipa kembali ke posisi awal
}

function add_all_my_pipes() {
  add_pipe(500, 100, 140);
  add_pipe(800, 50, 140);
  add_pipe(1000, 250, 140);
  add_pipe(1200, 150, 120);
  add_pipe(1600, 100, 120);
  add_pipe(1800, 150, 120);
  add_pipe(2000, 200, 120);
  add_pipe(2200, 250, 120);
  add_pipe(2400, 30, 100);
  add_pipe(2700, 300, 100);
  add_pipe(3000, 100, 80);
  add_pipe(3300, 250, 80);
  add_pipe(3600, 50, 60);
  var finish_line = new MySprite("http://s2js.com/img/etc/flappyend.png");
  finish_line.x = 3900;
  finish_line.velocity_x = pipe_speed;
  pipes.push(finish_line);
}

var pipe_piece = new Image();
pipe_piece.onload = add_all_my_pipes;
pipe_piece.src = "http://s2js.com/img/etc/flappypipe.png";

// <-- Diubah: Game loop sekarang menangani status 'character_select' -->
function Do_a_Frame() {
  ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);

  switch (game_mode) {
    case "character_select": {
      display_character_select();
      display_bar_running_along_bottom(); // Tampilkan bar bawah (statis)
      break;
    }
    case "prestart": {
      display_bar_running_along_bottom();
      show_the_pipes(); // Tampilkan pipa awal
      bird.Do_Frame_Things();
      display_intro_instructions();
      break;
    }
    case "running": {
      time_game_last_running = new Date();
      bottom_bar_offset = bottom_bar_offset + pipe_speed; // Gerakkan bar bawah
      display_bar_running_along_bottom();
      show_the_pipes();
      make_bird_tilt_appropriately();
      make_bird_slow_and_fall();
      check_for_end_game();
      bird.Do_Frame_Things();
      break;
    }
    case "over": {
      display_bar_running_along_bottom(); // Tampilkan bar bawah (statis)
      show_the_pipes();
      make_bird_slow_and_fall();
      bird.Do_Frame_Things();
      display_game_over();
      break;
    }
  }
}

var bottom_bar = new Image();
bottom_bar.src = "http://s2js.com/img/etc/flappybottom.png";

// Hapus inisialisasi bird awal
// var bird = new MySprite("./rico.png");
// var bird2 = new MySprite("./dara.png");
// bird.x = myCanvas.width / 3;
// bird.y = myCanvas.height / 2;

setInterval(Do_a_Frame, 1000 / FPS);