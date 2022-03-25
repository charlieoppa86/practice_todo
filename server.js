const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const MongoClient = require("mongodb").MongoClient;
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
require("dotenv").config();
app.set("view engine", "ejs");
app.use("/public", express.static("public"));

var db;

MongoClient.connect(process.env.DB_URL, function (error, client) {
  if (error) return console.log(error);

  db = client.db("todo");

  app.listen(process.env.PORT, function () {
    console.log(" 8080 온에어 ");
  });
});

app.get("/", function (req, res) {
  res.render("index.ejs");
});

app.get("/write", function (req, res) {
  res.render("write.ejs");
});

app.post("/add", function (req, res) {
  res.send("저장이 완료되었습니다");
  console.log(req.body.title);
  console.log(req.body.date);
  db.collection("counter").findOne(
    { name: "게시물갯수" },
    function (error, result) {
      var total = result.totalPost;
      db.collection("post").insertOne(
        { _id: total + 1, toDoList: req.body.title, toDoDate: req.body.date },
        function (error, result) {
          console.log("할일 저장 완료");
          db.collection("counter").updateOne(
            { name: "게시물갯수" },
            { $inc: { totalPost: 1 } },
            function (error, result) {
              if (error) {
                return console.log(error);
              }
            }
          );
        }
      );
    }
  );
});

app.get("/list", function (req, res) {
  db.collection("post")
    .find()
    .toArray(function (error, result) {
      console.log(result);
      res.render("list.ejs", { posts: result });
    });
});

app.delete("/delete", function (req, res) {
  req.body._id = parseInt(req.body._id);
  db.collection("post").deleteOne(req.body, function (error, result) {
    console.log("삭제 완료");
    res.status(200).send({ message: "성공했습니다" });
  });
});

app.get("/detail/:id", function (req, res) {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    function (error, result) {
      console.log(result);
      res.render("detail.ejs", { data: result });
    }
  );
});

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

app.use(
  session({ secret: "secretCode", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/login", function (req, res) {
  res.render("login.ejs", { userName: req.user });
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  function (req, res) {
    res.redirect("/");
  }
);

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
    },
    function (inputId, inputPw, done) {
      db.collection("login").findOne({ id: inputId }, function (error, result) {
        if (error) return done(error);

        if (!result)
          return done(null, false, { message: "아이디를 다시 확인하세요" });
        if (inputPw == result.pw) {
          return done(null, result);
        } else {
          return done(null, false, { message: "비밀번호를 다시 확인하세요" });
        }
      });
    }
  )
);

app.get("/mypage", logInOk, function (req, res) {
  res.render("mypage.ejs");
});

function logInOk(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.send("로그인이 필요합니다");
  }
}

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  db.collection("login").findOne({ id: id }, function (error, result) {
    done(null, result);
  });
  done(null, {});
});

app.get("/edit/:id", function (req, res) {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    function (error, result) {
      console.log(result);
      res.render("edit.ejs", { posting: result });
    }
  );
});

app.put("/edit", function (req, res) {
  db.collection("post").updateOne(
    { _id: parseInt(req.body.id) },
    {
      $set: { toDoList: req.body.title, toDoDate: req.body.date },
    },
    function (error, result) {
      console.log("수정 완료");
      res.redirect("/list");
    }
  );
});

app.get("/search", function (req, res) {
  db.collection("post")
    .find({ $text: { $search: req.query.value } })
    .toArray((error, result) => {
      console.log(result);
      res.render("search.ejs", { posts: result });
    });
});
