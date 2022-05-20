const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const jwt = require("jsonwebtoken");
// app.use(bodyParser.json());

const qiniu = require("qiniu");
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

//引入数据库连接模块
let dbConnect = require("./db");

app.use("/getToken", (req, res) => {
  //获取七牛云的token
  var accessKey = "DDinTpKdKIJi9NA0q2nMoJV-296wps2DYD5JUxb8";
  var secretKey = "POvLMBoC-EnwHWvwaJVkCjzLVvYuGl9TOVnzBpRv";
  var mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  var options = {
    scope: "xiaofenggeg",
  };
  var putPolicy = new qiniu.rs.PutPolicy(options);
  var uploadToken = putPolicy.uploadToken(mac);
  let token = uploadToken;
  res.send({ msg: "token获取成功", code: "200", token: token });
});

//时间函数
function Time() {
  let dt = new Date();
  let y = dt.getFullYear();
  let mt =
    dt.getMonth() + 1 < 10 ? "0" + (dt.getMonth() + 1) : dt.getMonth() + 1;
  let day =
    new Date().getDate() < 10
      ? "0" + new Date().getDate()
      : new Date().getDate();
  let h =
    new Date().getHours() < 10
      ? "0" + new Date().getHours()
      : new Date().getHours();
  let m =
    new Date().getMinutes() < 10
      ? "0" + new Date().getMinutes()
      : new Date().getMinutes();
  let s =
    new Date().getSeconds() < 10
      ? "0" + new Date().getSeconds()
      : new Date().getSeconds();
  let nowTime = `${y + "-" + mt + "-" + day + " " + h + ":" + m + ":" + s}`;
  return nowTime;
}
//===============================用户模块接口====================================
//检测用户名是否存在方法
let checkUsername = async (username) => {
  let sql = `select * from user where username =?`;
  let sqlArr = [username];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.length > 0) {
    return true;
  } else {
    return false;
  }
};
//用户登陆接口
app.use("/login", async (req, res) => {
  let { username, password } = req.body;
  if (await checkUsername(username)) {
    let sql = `select password,status from user where username=?`;
    let sqlArr = [username];
    dbConnect.sqlConnect(sql, sqlArr, async (error, data) => {
      if (data[0].password == password) {
        if (data[0].status != 0) {
          let sql = `select username,role from user where username=?`;
          let sqlArr = [username];
          let respData = await dbConnect.SySqlConnect(sql, sqlArr);
          let content = "333";
          let secretOrPrivateKey = "123456"; // 这是加密的key（密钥）
          let token = jwt.sign(
            {
              content,
              secretOrPrivateKey,
            },
            "my_token",
            { expiresIn: "0.5h" }
          );

          res.send({
            code: 200,
            msg: "登陆成功",
            token,
            userInfo: respData[0],
          });
        } else {
          res.send({
            code: 500,
            msg: "该用户未激活，请联系管理员激活后再登陆",
          });
        }
      } else {
        res.send({
          code: 500,
          msg: "密码错误，请重新输入密码",
        });
      }
    });
  } else {
    res.send({
      code: 400,
      msg: "用户名不存在，请先注册后再登陆",
    });
    return false;
  }
});
//用户注册接口
app.use("/register", async (req, res) => {
  let { username, password, role, status } = req.body;
  if (await checkUsername(username)) {
    res.send({
      code: 400,
      msg: "用户名已存在，请输入其他的用户名",
    });
  } else {
    let regTime = Time();
    let sql = `insert into user (username,password,role,time,status) values(?,?,?,?,?)`;
    let sqlArr = [username, password, role, regTime, status];
    let resp = await dbConnect.SySqlConnect(sql, sqlArr);
    if (resp.affectedRows == 1) {
      res.send({
        code: 200,
        msg: "注册成功",
      });
    } else {
      res.send({
        code: 500,
        msg: "注册失败",
      });
    }
  }
});

//部门添加接口
app.use("/Adddeap", async (req, res) => {
  let { dep_name, dep_num, dep_desc, dep_status } = req.body;
  dep_desc ? dep_desc : "";
  let regTime = Time();
  let sql = `insert into department (dep_name,dep_num,dep_status,dep_desc,time) values(?,?,?,?,?)`;
  let sqlArr = [dep_name, dep_num, dep_status, dep_desc, regTime];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: "部门添加成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "部门添加失败",
    });
  }
});
//部门列表查询
app.use("/departList", async (req, res) => {
  let resp = [];
  let { dep_name, dep_status, pageNum } = req.body;
  let pageSize = 10;
  if (!dep_name && !dep_status) {
    let sql = `select * from department order by time desc limit ?`;
    let sqlArr = [pageSize * pageNum];
    resp = await dbConnect.SySqlConnect(sql, sqlArr);
  } else if (dep_name && dep_status) {
    let sql = `select * from department where dep_name like ? and dep_status = ? order by time limit ?`;
    let sqlArr = [`%${dep_name}%`, dep_status, pageSize * pageNum];
    resp = await dbConnect.SySqlConnect(sql, sqlArr);
  } else {
    let queryString = dep_name ? "dep_name" : "dep_status";
    let queryContent = dep_name ? dep_name : dep_status;
    let sql = `select * from department where ${queryString} like ? order by time limit ?`;
    let sqlArr = [`%${queryContent}%`, pageSize * pageNum];
    resp = await dbConnect.SySqlConnect(sql, sqlArr);
  }
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "列表查询成功",
      data: resp,
      count: resp.length,
    });
  } else {
    res.send({
      code: 200,
      msg: "列表查询成功",
      data: [],
      count: 0,
    });
  }
});
//修改部门禁启用状态
app.use("/changeDepStatus", async (req, res) => {
  let { dep_id, dep_status } = req.body;
  let sql = `update department set dep_status =? where dep_id =? `;
  let sqlArr = [dep_status, dep_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: " 状态修改成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "状态修改失败",
    });
  }
});
//删除部门接口
app.use("/delDepartment", async (req, res) => {
  let { dep_id } = req.body;
  let sql = `delete from department where dep_id =? `;
  let sqlArr = [dep_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: " 删除成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "删除失败",
    });
  }
});
//查询部门详情
app.use("/queryDepById", async (req, res) => {
  let { dep_id } = req.body;
  let sql = `select * from department where dep_id =? `;
  let sqlArr = [dep_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "查询成功",
      data: resp[0],
    });
  } else {
    res.send({
      code: 500,
      msg: "查询失败",
      data: [],
    });
  }
});
//部门编辑接口
app.use("/editDepById", async (req, res) => {
  let { dep_id, dep_name, dep_num, dep_status, dep_desc } = req.body;
  dep_desc ? dep_desc : "";
  let sql = `update department set dep_name =?,dep_num=?,dep_status=?,dep_desc=?,time=?  where dep_id =? `;
  let sqlArr = [dep_name, dep_num, dep_status, dep_desc, Time(), dep_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: "编辑成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "编辑失败",
    });
  }
});
//查询启动部门名称
app.use("/queryUseDepList", async (req, res) => {
  let sql = `select dep_id,dep_name from department where dep_status = 0 `;
  let sqlArr = [];
  let respArr = await dbConnect.SySqlConnect(sql, sqlArr);
  if (respArr.length > 0) {
    res.send({
      code: 200,
      msg: "列表查询成功",
      data: respArr,
    });
  } else {
    res.send({
      code: 200,
      msg: "列表查询成功",
      data: [],
    });
  }
});

//=======================================职位部分接口=============================================

//职位添加接口

app.use("/Addjob", async (req, res) => {
  let { dep_id, job_name, job_num, job_status, job_desc } = req.body;
  job_desc ? job_desc : "";
  let regTime = Time();
  let sql = `insert into job (dep_id,job_name,job_num,job_status,job_desc,zwtime) values(?,?,?,?,?,?)`;
  let sqlArr = [dep_id, job_name, job_num, job_status, job_desc, regTime];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: "职位添加成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "职位添加失败",
    });
  }
});
//职位列表查询
app.use("/jobList", async (req, res) => {
  let resp = [];
  let { job_name, job_status, pageNum } = req.body;
  let pageSize = 10;
  if (!job_name && !job_status) {
    let sql = `select * from job inner join department on job.dep_id = department.dep_id order by zwtime desc limit ?`;
    let sqlArr = [pageSize * pageNum];
    resp = await dbConnect.SySqlConnect(sql, sqlArr);
  } else if (job_name && job_status) {
    let sql = `select * from job inner join department on job.dep_id = department.dep_id where job_name like ? and job_status = ? order by zwtime desc limit ?`;
    let sqlArr = [`%${job_name}%`, job_status, pageSize * pageNum];
    resp = await dbConnect.SySqlConnect(sql, sqlArr);
  } else {
    let queryString = job_name ? "job_name" : "job_status";
    let queryContent = job_name ? job_name : job_status;
    let sql = `select * from job inner join department on job.dep_id = department.dep_id where ${queryString} like ? order by zwtime desc limit ?`;
    let sqlArr = [`%${queryContent}%`, pageSize * pageNum];
    resp = await dbConnect.SySqlConnect(sql, sqlArr);
  }
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "列表查询成功",
      data: resp,
      count: resp.length,
    });
  } else {
    res.send({
      code: 200,
      msg: "列表查询成功",
      data: [],
      count: 0,
    });
  }
});
//修改职位禁启用状态
app.use("/changeJobStatus", async (req, res) => {
  let { job_id, job_status } = req.body;
  let sql = `update job set job_status =? where job_id =? `;
  let sqlArr = [job_status, job_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: " 职位状态修改成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "职位状态修改失败",
    });
  }
});
//删除职位接口
app.use("/delJob", async (req, res) => {
  let { job_id } = req.body;
  let sql = `delete from job where job_id =? `;
  let sqlArr = [job_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: " 职位删除成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "职位删除失败",
    });
  }
});
//查询职位详情
app.use("/queryJobById", async (req, res) => {
  let { job_id } = req.body;
  let sql = `select * from job where job_id =? `;
  let sqlArr = [job_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "查询成功",
      data: resp[0],
    });
  } else {
    res.send({
      code: 500,
      msg: "查询失败",
      data: [],
    });
  }
});
//职位编辑接口
app.use("/editJobById", async (req, res) => {
  let { dep_id, job_id, job_name, job_num, job_status, job_desc } = req.body;
  job_desc ? job_desc : "";
  let sql = `update job set job_name =?,job_num=?,job_status=?,job_desc=?,zwtime=?,dep_id=?  where job_id =? `;
  let sqlArr = [
    job_name,
    job_num,
    job_status,
    job_desc,
    Time(),
    dep_id,
    job_id,
  ];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: "职位编辑成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "职位编辑失败",
    });
  }
});

//查询所有职位列表不带分页
app.use("/queryAllJobListNotPage", async (req, res) => {
  let sql = `select job_name,job_id from job`;
  let sqlArr = [];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "查询成功",
      data: resp,
    });
  } else {
    res.send({
      code: 200,
      msg: "未查询到数据",
      data: [],
    });
  }
});

//===============================员工模块接口=====================================

//根据部门查询可用职位列表
app.use("/queryJobBydep", async (req, res) => {
  let { dep_id } = req.body;
  let sql = `select job_id,job_name from job where dep_id=? and job_status = 0`;
  let sqlArr = [dep_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "查询成功",
      data: resp,
    });
  } else {
    res.send({
      code: 200,
      msg: "未查询到数据",
      data: [],
    });
  }
});

//员工添加接口
app.use("/AddStaff", async (req, res) => {
  let {
    staff_name,
    staff_age,
    staff_sex,
    staff_phone,
    staff_school,
    staff_major,
    staff_status,
    dep_id,
    job_id,
    staff_desc,
    staff_picurl,
  } = req.body;
  let regTime = Time();
  let sql = `insert into staff (staff_name,staff_age,staff_sex,staff_phone,staff_school,staff_major,staff_status,dep_id,job_id,staff_desc,staff_date,staff_picurl) values(?,?,?,?,?,?,?,?,?,?,?,?)`;
  let sqlArr = [
    staff_name,
    staff_age,
    staff_sex,
    staff_phone,
    staff_school,
    staff_major,
    staff_status,
    dep_id,
    job_id,
    staff_desc,
    regTime,
    staff_picurl,
  ];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: "员工添加成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "员工添加失败",
    });
  }
});

//员工列表查询
app.use("/staffList", async (req, res) => {
  let resp = [];
  let { staff_name, staff_status, pageNum } = req.body;
  let pageSize = 10;
  if (!staff_name && !staff_status) {
    let sql = `select * from staff  order by staff_date desc limit ?`;
    let sqlArr = [pageSize * pageNum];
    resp = await dbConnect.SySqlConnect(sql, sqlArr);
  } else if (staff_name && staff_status) {
    let sql = `select * from staff where staff_name like ? and staff_status = ? order by staff_date desc  limit ? `;
    let sqlArr = [`%${staff_name}%`, staff_status, pageSize * pageNum];
    resp = await dbConnect.SySqlConnect(sql, sqlArr);
  } else {
    let queryString = staff_name ? "staff_name" : "staff_status";
    let queryContent = staff_name ? staff_name : staff_status;
    let sql = `select * from staff where ${queryString} like ? order by staff_date desc limit ? `;
    let sqlArr = [`%${queryContent}%`, pageSize * pageNum];
    resp = await dbConnect.SySqlConnect(sql, sqlArr);
  }
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "列表查询成功",
      data: resp,
      count: resp.length,
    });
  } else {
    res.send({
      code: 200,
      msg: "未查询到数据",
      data: [],
      count: 0,
    });
  }
});

//查询员工详情
app.use("/queryStaffById", async (req, res) => {
  let { staff_id } = req.body;
  let sql = `select * from staff where staff_id =? `;
  let sqlArr = [staff_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "查询成功",
      data: resp[0],
    });
  } else {
    res.send({
      code: 500,
      msg: "查询失败",
      data: [],
    });
  }
});

//员工编辑接口
app.use("/editStaffById", async (req, res) => {
  let {
    staff_id,
    staff_name,
    staff_age,
    staff_sex,
    staff_phone,
    staff_school,
    staff_major,
    staff_status,
    dep_id,
    job_id,
    staff_desc,
    staff_picurl,
  } = req.body;
  let sql = `update staff set staff_name =?,staff_age=?,staff_sex=?,staff_phone=?,staff_school=?,staff_major=?,staff_status=?,dep_id=?,job_id=?,staff_desc=?,staff_picurl =? where staff_id =? `;
  let sqlArr = [
    staff_name,
    staff_age,
    staff_sex,
    staff_phone,
    staff_school,
    staff_major,
    staff_status,
    dep_id,
    job_id,
    staff_desc,
    staff_picurl,
    staff_id,
  ];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: "员工信息编辑成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "员工信息编辑失败",
    });
  }
});

//员工删除接口
app.use("/delStaff", async (req, res) => {
  let { staff_id } = req.body;
  let sql = `delete from staff where staff_id =? `;
  let sqlArr = [staff_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: " 员工删除成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "员工删除失败",
    });
  }
});

//====================================请假模块=======================================
//查询可以请假人员列表
app.use("/queryAllVacateUse", async (req, res) => {
  let sql = `select staff_id,staff_name from staff where staff_status = 0 `;
  let sqlArr = [];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "查询成功",
      data: resp,
    });
  } else {
    res.send({
      code: 200,
      msg: "未查询到数据",
      data: [],
    });
  }
});

//请假数据添加
app.use("/addvacate", async (req, res) => {
  let { staff_id, start_date, vacate_desc, end_date } = req.body;
  let create_time = Time();
  let sql = `insert into vacate (staff_id,start_date,end_date,vacate_desc,create_time) values(?,?,?,?,?)`;
  let sqlArr = [staff_id, start_date, end_date, vacate_desc, create_time];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    let sql = `update staff set staff_status = 1 where staff_id=?`;
    let sqlArr = [staff_id];
    let newresp = await dbConnect.SySqlConnect(sql, sqlArr);
    if (newresp.affectedRows == 1) {
      res.send({
        code: 200,
        msg: "请假成功",
      });
    }
  } else {
    res.send({
      code: 500,
      msg: "请假失败",
    });
  }
});

//查询请假列表
app.use("/queryVacatelist", async (req, res) => {
  let sql = `SELECT staff_name,vacate_desc,vacate_id,create_time,start_date,end_date,staff.staff_id FROM vacate JOIN staff WHERE 
   vacate.staff_id = staff.staff_id order by create_time desc`;
  let sqlArr = [];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "查询成功",
      data: resp,
      count: resp.length,
    });
  } else {
    res.send({
      code: 200,
      msg: "未查询到数据",
      data: [],
      count: 0,
    });
  }
});

app.use("/delvacate", async (req, res) => {
  let { vacate_id, staff_id } = req.body;
  let sql = `delete from vacate where vacate_id =? `;
  let sqlArr = [vacate_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);

  if (resp.affectedRows == 1) {
    let sql = `update staff set staff_status = 0 where staff_id =?`;
    let sqlArr = [staff_id];
    let newresp = await dbConnect.SySqlConnect(sql, sqlArr);
    if (newresp.affectedRows == 1) {
      res.send({
        code: 200,
        msg: " 数据删除成功",
      });
    }
  } else {
    res.send({
      code: 500,
      msg: "数据删除失败",
    });
  }
});

//查询数据统计接口
app.use("/queryInfo", async (req, res) => {
  //统计部门数
  let sql = `select count(*) as  dpNum from department`;
  let sqlArr = [];
  let dpNum = await dbConnect.SySqlConnect(sql, sqlArr);
  //统计职位数
  let sql1 = `select count(*) as  JobNum from job`;
  let sqlArr1 = [];
  let JobNum = await dbConnect.SySqlConnect(sql1, sqlArr1);
  //统计员工数
  let sql2 = `select count(*) as  StaffNum from staff`;
  let sqlArr2 = [];
  let StaffNum = await dbConnect.SySqlConnect(sql2, sqlArr2);
  //统计用户数
  let sql3 = `select count(*) as  UserNum from user`;
  let sqlArr3 = [];
  let UserNum = await dbConnect.SySqlConnect(sql3, sqlArr3);
  res.send({
    code: 200,
    msg: "查询成功",
    dpNum,
    JobNum,
    StaffNum,
    UserNum,
  });
});

//用户列表查询

app.use("/queryUserList", async (req, res) => {
  let sql = `SELECT * FROM user order by time desc`;
  let sqlArr = [];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "查询成功",
      data: resp,
      count: resp.length,
    });
  } else {
    res.send({
      code: 200,
      msg: "未查询到数据",
      data: [],
      count: 0,
    });
  }
});

//用户删除
app.use("/delUser", async (req, res) => {
  let { user_id, role } = req.body;
  if (role == 0) {
    res.send({
      code: 500,
      msg: "管理员用户无法删除",
    });
    return false;
  } else {
    let sql = `delete from user where user_id =? `;
    let sqlArr = [user_id];
    let resp = await dbConnect.SySqlConnect(sql, sqlArr);
    if (resp.affectedRows == 1) {
      res.send({
        code: 200,
        msg: " 删除成功",
      });
    } else {
      res.send({
        code: 500,
        msg: "删除失败",
      });
    }
  }
});

//用户激活
app.use("/useUser", async (req, res) => {
  let { user_id, status } = req.body;

  let sql = `update user set status = ? where user_id =? `;
  let sqlArr = [status, user_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: " 操作成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "操作失败",
    });
  }
});

//用户打卡接口
app.use("/punch", async (req, res) => {
  let {
    staff_name,
    type,
    start_date,
    start_time,
    splice_date,
    end_date,
    end_time,
  } = req.body;

  //表示上班打卡
  if (type == 1) {
    //检验当前天打卡记录是否存在
    let sql = `select * from attendance where staff_name = ? and start_date like ?`;
    let sqlArr = [staff_name, `%${splice_date}%`];
    let resp = await dbConnect.SySqlConnect(sql, sqlArr);

    if (resp && resp.length > 0) {
      //查询下班卡是否存在 已存在则不能修改上班卡
      let sql = `select * from attendance where staff_name = ? and end_date like ?`;
      let sqlArr = [staff_name, `%${splice_date}%`];
      let respEndDate = await dbConnect.SySqlConnect(sql, sqlArr);
      if (respEndDate && respEndDate.length > 0) {
        //表示已存在下班卡  无法修改上班卡
        res.send({
          code: 500,
          msg: "已打过下班卡，无法修改上班打卡，请联系管理员进行操作",
        });
      } else {
        let sql = `update attendance set start_date = ?,start_time = ? where staff_name =? and start_date like ?  `;
        let sqlArr = [start_date, start_time, staff_name, `%${splice_date}%`];
        let respData = await dbConnect.SySqlConnect(sql, sqlArr);
        console.log(888, respData);

        if (respData.affectedRows == 1) {
          res.send({
            code: 200,
            msg: " 上班打卡更新成功",
          });
        } else {
          res.send({
            code: 500,
            msg: "上班打卡更新失败",
          });
        }
      }
    } else {
      let sql = `insert into attendance (staff_name,start_date,start_time) values (?,?,?)`;
      let sqlArr = [staff_name, start_date, start_time];
      let respData = await dbConnect.SySqlConnect(sql, sqlArr);

      if (respData.affectedRows == 1) {
        res.send({
          code: 200,
          msg: " 上班打卡成功",
        });
      } else {
        res.send({
          code: 500,
          msg: "上班打卡失败",
        });
      }
    }
  } else {
    //下班打卡
    let sql = `select * from attendance where staff_name = ? and start_date like ?`;
    let sqlArr = [staff_name, `%${splice_date}%`];
    let resp = await dbConnect.SySqlConnect(sql, sqlArr);

    if (resp && resp.length > 0) {
      let sql = `update attendance set end_date = ?,end_time = ?  where staff_name = ? and start_date like ? `;
      let sqlArr = [end_date, end_time, staff_name, `%${splice_date}%`];
      let respData = await dbConnect.SySqlConnect(sql, sqlArr);
      if (respData.affectedRows == 1) {
        res.send({
          code: 200,
          msg: "下班打卡成功",
        });
      } else {
        res.send({
          code: 500,
          msg: "下班打卡失败",
        });
      }
    } else {
      res.send({
        code: 500,
        msg: "未查询到上班打卡记录，无法打下班卡，请联系管理员进行补卡操作",
      });
    }
  }
});

//用户打卡列表查询
app.use("/punchList", async (req, res) => {
  let resp = [];
  let { staff_name, pageNum } = req.body;
  let pageSize = 10;
  let sql = "";
  let sqlArr = [];

  if (staff_name && staff_name.length > 0) {
    sql = `SELECT * FROM attendance where staff_name like? order by start_time desc limit ?`;
    sqlArr = [`%${staff_name}%`, pageSize * pageNum];
  } else {
    sql = `SELECT * FROM attendance order by start_time desc limit ?`;
    sqlArr = [pageSize * pageNum];
  }

  resp = await dbConnect.SySqlConnect(sql, sqlArr);

  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "列表查询成功",
      data: resp,
      count: resp.length,
    });
  } else {
    res.send({
      code: 200,
      msg: "列表查询成功",
      data: [],
      count: 0,
    });
  }
});

//打卡记录删除
app.use("/delPunch", async (req, res) => {
  let { attend_id } = req.body;
  let sql = `delete from attendance where attend_id =? `;
  let sqlArr = [attend_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: " 删除成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "删除失败",
    });
  }
});

//薪资添加接口
app.use("/AddSalary", async (req, res) => {
  let { staff_name, dep_id, job_id, remake, month, money, work_day } = req.body;
  let regTime = Time();
  let sql = `insert into salary (staff_name, dep_id, job_id, remake, month, money,work_day,create_time ) values(?,?,?,?,?,?,?,?)`;
  let sqlArr = [
    staff_name,
    dep_id,
    job_id,
    remake,
    month,
    money,
    work_day,
    regTime,
  ];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: "薪资记录添加成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "薪资记录添加失败",
    });
  }
});

//薪资列表查询
app.use("/salaryList", async (req, res) => {
  let resp = [];
  let { staff_name, month, pageNum } = req.body;
  let pageSize = 10;
  if (!staff_name && !month) {
    let sql = `select * from salary  order by create_time desc limit ?`;
    let sqlArr = [pageSize * pageNum];
    resp = await dbConnect.SySqlConnect(sql, sqlArr);
  } else if (staff_name && month) {
    let sql = `select * from salary where staff_name like ? and month = ? order by create_time desc  limit ? `;
    let sqlArr = [`%${staff_name}%`, month, pageSize * pageNum];
    resp = await dbConnect.SySqlConnect(sql, sqlArr);
  } else {
    let queryString = staff_name ? "staff_name" : "month";
    let queryContent = month ? month : staff_name;
    let sql = `select * from salary where ${queryString} like ? order by create_time desc limit ? `;
    let sqlArr = [`%${queryContent}%`, pageSize * pageNum];
    resp = await dbConnect.SySqlConnect(sql, sqlArr);
  }
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "列表查询成功",
      data: resp,
      count: resp.length,
    });
  } else {
    res.send({
      code: 200,
      msg: "未查询到数据",
      data: [],
      count: 0,
    });
  }
});

//查询薪资详情
app.use("/querySalaryById", async (req, res) => {
  let { salary_id } = req.body;
  let sql = `select * from salary where salary_id =? `;
  let sqlArr = [salary_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.length > 0) {
    res.send({
      code: 200,
      msg: "查询成功",
      data: resp[0],
    });
  } else {
    res.send({
      code: 500,
      msg: "查询失败",
      data: [],
    });
  }
});

//薪资详情编辑接口
app.use("/editSalaryById", async (req, res) => {
  let {
    staff_name,
    dep_id,
    job_id,
    remake,
    month,
    money,
    work_day,
    salary_id,
  } = req.body;
  let regTime = Time();
  let sql = `update salary set staff_name =?,dep_id=?,job_id=?,remake=?,month=?,money=?,work_day=?,create_time=? where salary_id =? `;
  let sqlArr = [
    staff_name,
    dep_id,
    job_id,
    remake,
    month,
    money,
    work_day,
    regTime,
    salary_id,
  ];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: "薪资信息编辑成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "薪资信息编辑失败",
    });
  }
});

//薪资记录删除
app.use("/delSalary", async (req, res) => {
  let { salary_id } = req.body;
  let sql = `delete from salary where salary_id =? `;
  let sqlArr = [salary_id];
  let resp = await dbConnect.SySqlConnect(sql, sqlArr);
  if (resp.affectedRows == 1) {
    res.send({
      code: 200,
      msg: " 删除成功",
    });
  } else {
    res.send({
      code: 500,
      msg: "删除失败",
    });
  }
});

app.listen(6040, () => {
  console.log("项目启动成功，监听在6040端口！！！");
});
