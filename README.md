# 项目说明

多学科会诊系统。

# 安装依赖

pip install fastapi uvicorn openai

# vpn
连接太初大模型时，需连接协和vpn。

# 启动服务
- uvicorn main:app --reload

- 访问 localhost:8000，可看到大模型调用情况。

- 将index.html选择以浏览器打开，即可看到网页并运行。

# 测试样例（也可自行填写任何样例）

### 1. 初诊阶段填写：

  患者背景：
  - 年龄：25 岁
  - 十几岁时首次出现症状
  
  主要症状和不适：
  - 肌肉无力和疲劳
  - 偶尔肌肉痉挛
  - 头晕发作

### 2. 实验室检测填写数值：

  - 3.1,  # serum_potassium
  - 94.5, # urine_potassium
  - no     # high_blood_pressure
  - 7.48, # PH
  - 30,   # bicarbonate

