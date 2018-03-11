// phina.js をグローバル領域に展開
phina.globalize();
// ゲームの定数作成
var SCREEN_WIDTH    = 640;
var SCREEN_HEIGHT   = 960;
var RESULT_PARAM = {
  score: 256,
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};
// リソースの読み込み
var ASSETS = {
  image: {
    "player": "./cat.png",
    "enemy": "./unchi.png",
    "map": "./back.png",
  },
  sound: {
    // "bgm": "https://raw.githubusercontent.com/KazumasaYasui/phina_game_2/master/bgm.mp3",
    "bgm": "./bgm.mp3",
  },
};

// タイトルシーン
phina.define("TitleScene", {
  superClass: "phina.game.TitleScene",
  init: function() {
    this.superInit({
      title: "スターを目指せ！",
      backgroundColor: 'rgb(102,205,170)',
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    });
  },
});

// メインシーン
phina.define("MainScene", {
  superClass: 'DisplayScene',

  init: function() {
    this.superInit({
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    });
    // BGM設定
    this.bgm = phina.asset.AssetManager.get("sound", "bgm");
    this.bgm.setLoop(true).play();
    // MAP設定
    this.map = phina.display.Sprite("map")
      .setOrigin(0, 0)
      .setScale(2)
      .addChildTo(this);

    if(!phina.isMobile()){
      Label({
        text: 'スマホなどの加速度センサー\n対応端末で見てね',
        x: 320,
        y: 480,
      }).addChildTo(this);
    }
    var anaLayer = this.anaLayer = DisplayElement().addChildTo(this);
    // 適当に Ana を配置
    (7).times(function(i){
      var x = SCREEN_WIDTH / 2;
      
      // 奇数なら右側で偶数なら左側
      if(i % 2 === 0){
        x += Math.randint(0, x);
      }else{
        x -= Math.randint(0, x);
      }

      Ana({
        x: x,
        y:SCREEN_HEIGHT * 0.1 + (i / 7 * SCREEN_HEIGHT * 0.8)
      }).addChildTo(anaLayer);
    });

    this.goal = StarShape({
      x: Math.randint(50, SCREEN_WIDTH - 50),
      y: SCREEN_HEIGHT - 30,
      radius: 30,
      fill: 'gold'
    }).addChildTo(this);
    // Label({
    //   text: 'GOAL'
    // }).addChildTo(this.goal);

    // this.player = CircleShape({
    //   radius: 20,
    //   x: Math.randint(100, SCREEN_WIDTH - 100),
    //   y: 30
    // }).addChildTo(this);
    this.player = Sprite('player').addChildTo(this);
    // this.player.x: Math.randint(100, SCREEN_WIDTH - 100);
    // this.player.y: 30;
    this.player.x = this.gridX.center(-2);
    this.player.y = this.gridY.center(-7.5);
    this.player.width = 100;
    this.player.height = 100;
    // Label({
    //   text: 'YOU',
    //   fontSize: 20,
    // }).addChildTo(this.player);

    // 時間表示
    this.timeLabel = Label({
      text: 0,
      x: 640/2,
      y: 30,
    }).addChildTo(this);

    this.timeLabel.time = 0;

    this.timeLabel.update = function(app){
      // ミリ秒計測
      this.time += app.deltaTime;
      // 秒単位小数点以下切り捨て表示
      this.text = this.time / 1000| 0;
    };
  },

  update: function(app) {
    // ゲームオーバーの場合は更新しない
    if(this.isGameOver) return;

    // PCでデバッグ用にキーボード操作
    var angle = app.keyboard.getKeyAngle();
    if(typeof angle === 'number'){
      var rad = (angle + 90).toRadian();
      var cos = Math.cos(rad);
      var sin = Math.sin(rad);
      this.player.position.add({x: sin * 5, y: cos * 5});
    }

    // 加速度センサーを使うよ
    var accel = app.accelerometer;
    // 重力情報
    var gravity = accel.gravity;

    var player = this.player;

    // 重力の半分移動
    player.x += gravity.x / 2;
    player.y += -gravity.y / 2;

    // はみ出てたらやつ
    this.checkHamide(player);

    var self = this;

    // 穴との当たり判定
    this.anaLayer.children.forEach(function(ana){

      // はみでもどし
      self.checkHamide(ana);
      if(player.hitTestElement(ana.hitCircle)){
        self.bgm.stop();
        // 当たった
        self.isGameOver = true;

        // 穴の動き止める
        ana.awake = false;

        //穴に落ちていく風のアニメーション
        player.tweener.to({
          scaleX: 0,
          scaleY: 0,
          x: ana.x,
          y: ana.y,
        }, 500, 'swing').call(function(){
          self.exit({
            score: -100000,
            message: 'ゲームオーバー'
          });
        });
      }
    });

    // ゴールとの当たり判定
    if(this.goal.hitTestElement(player)){
      self.bgm.stop();
      this.exit({
        score: 100000 - this.timeLabel.time,
        message: this.timeLabel.text + '秒でGOAL!',
      });
    }
  },

  checkHamide: function(elm){
    // はみ出てないか
    if(elm.x > SCREEN_WIDTH){
      elm.x = SCREEN_WIDTH;
    }
    else if(elm.x < 0) {
      elm.x = 0;
    }

    if(elm.y > SCREEN_HEIGHT){
      elm.y = SCREEN_HEIGHT;
    }
    else if(elm.y < 0){
      elm.y = 0;
    }
  }
});

// エンドシーン
phina.define("EndScene", {
  superClass: "phina.game.ResultScene",
  init: function(time) {
    // スコア計算
    RESULT_PARAM.score = (Math.floor(time*100/30)/100)+"秒でゴールしました！";
    // スコア
    this.superInit(RESULT_PARAM);
  },
  // Backボタンでタイトルに
  onnextscene: function (e) {
    e.target.app.replaceScene(TitleScene());
  },
});

phina.define('Ana', {
  superClass: 'CircleShape',
  init: function(opts){
    this.superInit({}.$extend(opts).$safe(Ana.defaults));
    // 本当の当たり判定 (落下判定の半径)
    this.hitCircle = DisplayElement({
      radius: 3,
    }).addChildTo(this)
    // 当たり判定を円に設定
    .setBoundingType('circle')
    // 非表示
    .hide();

    // Anaが表示されているpositionと共有化
    this.hitCircle.position = this.position;

    // 横に動くよ
    //ランダムで右移動から始めるか、左移動からじ始めるか
    if(Math.randbool()){ 
      this.tweener.by({
        x: SCREEN_WIDTH
      }, Math.randint(3000,5000)).by({
        x: - SCREEN_WIDTH
      }, Math.randint(3000,5000)).setLoop(true);
    }
    else {
      this.tweener.by({
        x: - SCREEN_WIDTH
      }, Math.randint(3000, 5000)).by({
        x: SCREEN_WIDTH
      }, Math.randint(3000, 5000)).setLoop(true);
    }
  },

  _static: {
    defaults: {
      radius: 30,
      fill: 'pink',
      stroke: 'white',
    },
  }
});

phina.main(function() {

  var app = GameApp({
    title: 'title',
    startLabel: location.search.substr(1).toObject().scene || 'main',
    assets: ASSETS,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  });

  app.run();
});