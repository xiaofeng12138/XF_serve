const mysql = require("mysql");

module.exports = {
  //数据库连接
  config: {
    host: "localhost",
    port: "3306",
    user: "root",
    password: "root",
    database: "comp",
  },

  //连接数据库 使用mysql的连接池方式进行连接
  //连接池对象

  sqlConnect: function (sql, sqlArr, callBack) {
    let pool = mysql.createPool(this.config);
    pool.getConnection((err, conn) => {
      if (err) {
        console.log("数据库连接失败");
        return;
      }
      conn.query(sql, sqlArr, callBack);
      conn.release();
    });
  },

  //异步操作返回
  SySqlConnect: function (sysql, sqlArr) {
    return new Promise((resolve, reject) => {
      let pool = mysql.createPool(this.config);
      pool.getConnection((err, conn) => {
        if (err) {
          console.log("数据库连接失败");
          reject(err);
        } else {
          //事件驱动回调
          conn.query(sysql, sqlArr, (error, data) => {
            if (error) {
              reject(err);
            } else {
              resolve(data);
            }
          });
          //释放链接
          conn.release();
        }
      });
    }).catch((error) => {
      console.log(error);
    });
  },
};
