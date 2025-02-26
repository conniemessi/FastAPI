# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Optional, List, Any
import openai
from openai import OpenAI
import os
from datetime import datetime
import onnxruntime as rt
import json
import numpy as np
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pathlib import Path


app = FastAPI()

# Configure CORS - more specific settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
# app.mount("/static", StaticFiles(directory="static"), name="static")
# Create and mount static directory
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure OpenAI
# Replace this with your actual OpenAI API key
client = OpenAI(
    api_key="gzw@123",  # Changed to Xiehe credentials
    base_url="http://10.200.213.30:1025/v1",  # Changed to Xiehe API endpoint
)

# openai.api_key = "sk-FO3yus4aQ3OLusojMZXp26LXHiTZFv6pnPDNtDT70pTIeeAG"

# client = OpenAI(
#     api_key="sk-HkrcTbpXxSmXuBRviOp43r9RV8mncrELLpR3lyEoo6jnERW2",
#     base_url="https://api.moonshot.cn/v1",
# )

# client = OpenAI(
#     api_key="sk-defb1a91d2084a7a9bb981c40a5bbeea",
#     base_url="https://api.deepseek.com/v1",
# )

# @app.get("/")
# async def root():
#     return {"message": "Medical Diagnosis API is running"}

@app.get("/")
async def serve_index():
    return FileResponse('index.html')


class PredictionRequest(BaseModel):
    serum_potassium: float
    urine_potassium: float
    PH: float
    bicarbonate: float
    high_blood_pressure: int


# Load model and scaler parameters
try:
    # Load the ONNX model
    model_path = static_dir / "model.onnx"
    ort_session = rt.InferenceSession(str(model_path))
    
    # Load scaler parameters
    scaler_path = static_dir / "scaler_params.json"
    with open(scaler_path, 'r') as f:
        scaler_params = json.load(f)
    
    # Print model info for debugging
    print("Model input name:", ort_session.get_inputs()[0].name)
    print("Model input shape:", ort_session.get_inputs()[0].shape)
    print("Model output name:", ort_session.get_outputs()[0].name)
    print("Model output shape:", ort_session.get_outputs()[0].shape)
    
    print("Model and scaler loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")
    raise

@app.post("/predict")
async def predict(request: PredictionRequest):
    try:
        # Convert input features to array
        features = np.array([
            request.serum_potassium,
            request.urine_potassium,
            request.PH,
            request.bicarbonate,
            request.high_blood_pressure
        ])

        # Standardize features
        features_scaled = (features - np.array(scaler_params['mean_'])) / np.array(scaler_params['scale_'])
        
        # Reshape for model input (ensure it's 2D array)
        features_scaled = features_scaled.reshape(1, -1).astype(np.float32)

        # Make prediction
        input_name = ort_session.get_inputs()[0].name
        prediction = ort_session.run(None, {input_name: features_scaled})
        print("prediction", prediction)
        # Get probability (assuming binary classification)
        probability = float(prediction[1][0][1])  # Adjust index based on your model output

        return {"probability": probability}

    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scaler-params")
async def get_scaler_params():
    try:
        scaler_path = static_dir / "scaler_params.json"
        if not scaler_path.exists():
            raise HTTPException(status_code=404, detail="Scaler parameters file not found")
        with open(scaler_path, 'r') as f:
            return JSONResponse(content=json.load(f))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DiagnosisRequest(BaseModel):
    symptoms: str
    patient_history: Optional[str] = None
    test_results: Optional[Dict[str, Any]] = None
    ml_prediction: Optional[float] = None  # Add this field
    round: Optional[int] = 1
    previous_opinions: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"  # Allow extra fields

    
@app.post("/analyze-symptoms")
async def analyze_symptoms(request: DiagnosisRequest):
    # if not openai.api_key:
    #     raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    try:
        # openai.ChatCompletion.create
        completion = client.chat.completions.create(
            model="taichu",  #model="taichu",  # Changed model
            messages=[
                {"role": "system",
                 "content": "You are a medical diagnostic assistant specialized in Gitelman syndrome."},
                {"role": "user", "content": f"""
                Please analyze these symptoms for potential Gitelman syndrome:
                Symptoms: {request.symptoms}
                Patient History: {request.patient_history or 'Not provided'}

                请提供：
                1. 初步评估
                2. 推荐的实验室检测
                3. 关键诊断考虑因素
                特别关注 Gitelman 综合征的指标。
                整个回答应控制在 150 字以内。
                在每个要点之间换行。
                """}
            ]
        )

        return {"analysis": completion.choices[0].message.content}
    except Exception as e:
        print(f"Error in analyze_symptoms: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/genetic-opinion")
async def get_genetic_opinion(request: DiagnosisRequest):
    try:
        test_results_str = "\n".join([f"{k}: {v}" for k, v in (request.test_results or {}).items()])
        round_num = getattr(request, 'round', 1)
        previous_opinions = getattr(request, 'previous_opinions', {})
        
        # Customize prompt based on round
        if round_num == 1:
            system_content = """You are Dr. Smith, a genetic specialist focusing on hereditary kidney disorders.
            For initial Gitelman syndrome diagnosis, consider:
            1. Age of onset (青少年或成年发病)
            2. Family history (家族史)
            3. Genetic testing recommendations (SLC12A3基因)
            4. Differential diagnosis from Bartter syndrome"""
        elif round_num == 2:
            system_content = """You are Dr. Smith. After reviewing initial opinions, provide detailed genetic analysis.
            Focus on:
            1. Genetic testing strategy
            2. Family screening recommendations
            3. Genotype-phenotype correlations"""
        else:
            system_content = """You are Dr. Smith. This is the final round.
            Provide comprehensive genetic consultation including:
            1. Final genetic diagnosis
            2. Family screening plan
            3. Long-term genetic counseling recommendations"""

        # Include previous opinions in the prompt if available
        previous_context = ""
        if previous_opinions:
            previous_context = f"\n前轮讨论意见：\n{json.dumps(previous_opinions, ensure_ascii=False, indent=2)}"
        
        completion = client.chat.completions.create(
            model="taichu",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": f"""
                请分析以下病例的遗传学特征：
                症状：{request.symptoms}
                病史：{request.patient_history or 'Not provided'}
                检验结果：{test_results_str or 'Not provided'}
                {previous_context}

                第{round_num}轮讨论要求：
                {get_genetic_round_requirements(round_num)}

                请用中文回答，控制在80字以内。
                在每个要点之间换行。
                """}
            ]
        )
        return {"diagnosis": completion.choices[0].message.content}
    except Exception as e:
        print(f"Error in get_genetic_opinion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lab-opinion")
async def get_lab_opinion(request: DiagnosisRequest):
    try:
        test_results_str = "\n".join([f"{k}: {v}" for k, v in (request.test_results or {}).items()])
        round_num = getattr(request, 'round', 1)
        previous_opinions = getattr(request, 'previous_opinions', {})
        
        # Customize prompt based on round
        if round_num == 1:
            system_content = """You are Dr. Chen, a laboratory medicine specialist.
            For initial Gitelman syndrome diagnosis, focus on:
            1. Primary criteria:
               - 低血钾: K+ < 3.5 mmol/L
               - 肾性失钾: 24h尿钾 > 20mmol
            2. Supporting criteria:
               - 代谢性碱中毒
               - 血压正常或偏低
               - 低血镁
               - 低尿钙"""
        elif round_num == 2:
            system_content = """You are Dr. Chen. After reviewing initial findings,
            provide detailed analysis of:
            1. Electrolyte patterns
            2. Acid-base balance
            3. Additional recommended tests"""
        else:
            system_content = """You are Dr. Chen. This is the final round.
            Provide comprehensive lab interpretation including:
            1. Final lab diagnosis
            2. Monitoring recommendations
            3. Key parameters for follow-up"""

        # Include previous opinions in the prompt if available
        previous_context = ""
        if previous_opinions:
            previous_context = f"\n前轮讨论意见：\n{json.dumps(previous_opinions, ensure_ascii=False, indent=2)}"
        
        completion = client.chat.completions.create(
            model="taichu",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": f"""
                请分析以下检验结果：
                症状：{request.symptoms}
                病史：{request.patient_history or 'Not provided'}
                检验结果：{test_results_str or 'Not provided'}
                {previous_context}

                第{round_num}轮讨论要求：
                {get_lab_round_requirements(round_num)}

                请用中文回答，控制在80字以内。
                在每个要点之间换行。
                """}
            ]
        )
        return {"diagnosis": completion.choices[0].message.content}
    except Exception as e:
        print(f"Error in get_lab_opinion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def get_genetic_round_requirements(round_num):
    if round_num == 1:
        return """
        1. 初步遗传学评估
        2. 基因检测建议
        3. 家族史分析
        """
    elif round_num == 2:
        return """
        1. 结合其他专家意见完善遗传学分析
        2. 详细的基因检测方案
        3. 家族成员筛查建议
        """
    else:
        return """
        1. 最终遗传学诊断意见
        2. 完整的家族筛查计划
        3. 遗传咨询建议
        """

def get_lab_round_requirements(round_num):
    if round_num == 1:
        return """
        1. 初步实验室检查分析
        2. 关键指标解读
        3. 补充检查建议
        """
    elif round_num == 2:
        return """
        1. 结合其他专家意见完善检验分析
        2. 详细的电解质紊乱分析
        3. 酸碱平衡评估
        """
    else:
        return """
        1. 最终实验室诊断意见
        2. 长期监测指标建议
        3. 随访检查计划
        """

@app.post("/treatment-opinion")
async def get_treatment_opinion(request: DiagnosisRequest):
    try:
        print(f"Received request data: {request}")  # Debug log
        
        test_results_str = "\n".join([f"{k}: {v}" for k, v in (request.test_results or {}).items()])
        round_num = request.round
        previous_opinions = request.previous_opinions or {}
        
        print(f"Round: {round_num}")  # Debug log
        print(f"Previous opinions: {previous_opinions}")  # Debug log

        # Customize prompt based on round
        if round_num == 1:
            system_content = """You are Dr. Johnson, a treatment specialist. 
            Provide initial treatment recommendations based on the symptoms and test results."""
        elif round_num == 2:
            system_content = """You are Dr. Johnson. Consider your colleagues' initial opinions and 
            provide more detailed treatment recommendations. Focus on potential complications and monitoring needs."""
        else:
            system_content = """You are Dr. Johnson. This is the final round. 
            Provide concrete treatment plan and follow-up schedule based on the full discussion."""

        # Include previous opinions in the prompt if available
        previous_context = ""
        if previous_opinions:
            previous_context = f"\n前轮讨论意见：\n{json.dumps(previous_opinions, ensure_ascii=False, indent=2)}"
        
        second_opinion = client.chat.completions.create(
            model="taichu",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": f"""
                基于以下患者信息制定治疗方案：
                症状：{request.symptoms}
                病史：{request.patient_history or 'Not provided'}
                检验结果：{test_results_str or 'Not provided'}
                {previous_context}

                第{round_num}轮讨论要求：
                {get_round_requirements(round_num)}

                请用中文回答，控制在80字以内。
                在每个要点之间换行。
                """}
            ]
        )
        return {"diagnosis": second_opinion.choices[0].message.content}
    except Exception as e:
        print(f"Error in get_treatment_opinion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def get_round_requirements(round_num):
    if round_num == 1:
        return """
        1. 初步治疗方案评估
        2. 基本用药建议
        3. 初步监测计划
        """
    elif round_num == 2:
        return """
        1. 结合其他专家意见完善治疗方案
        2. 详细讨论可能的并发症
        3. 提出具体的监测指标
        """
    else:
        return """
        1. 最终治疗方案确定
        2. 详细随访计划
        3. 长期预后管理建议
        """

@app.post("/summary")
async def get_summary(request: DiagnosisRequest):
    try:
        test_results_str = "\n".join([f"{k}: {v}" for k, v in (request.test_results or {}).items()])
        
        # Get ML prediction from request
        ml_result = f"机器学习模型预测该病例为Gitelman综合征的概率为{request.ml_prediction:.1%}" if request.ml_prediction is not None else "机器学习模型预测暂不可用"

        # First, get all expert opinions
        genetic_response = await get_genetic_opinion(request)
        treatment_response = await get_treatment_opinion(request)
        lab_response = await get_lab_opinion(request)

        # Format discussions for the summary
        discussions_str = f"""
        专家讨论记录：
        遗传科专家：
        {genetic_response['diagnosis']}

        治疗科专家：
        {treatment_response['diagnosis']}

        检验科专家：
        {lab_response['diagnosis']}

        人工智能辅助诊断：
        {ml_result}
        """
        
        summary = client.chat.completions.create(
            model="taichu",
            messages=[
                {"role": "system", 
                 "content": """你是一位AI医疗会诊主持人。请基于专家的讨论内容和机器学习模型的预测结果，生成一个专业、全面的会诊总结。

                要求：
                1. 总结格式应包含：诊断依据（包括AI预测）、诊疗建议、随访计划和生活建议
                2. 突出专家们达成共识的关键点
                3. 结合机器学习模型的预测结果，增强诊断的可信度
                4. 整合各方意见，突出重点
                5. 保持医学专业性的同时确保表述清晰
                6. 语气应专业且富有主持人特色

                请生成一个结构化的会诊总结。"""},
                {"role": "user", "content": f"""
                基于以下专家讨论和AI预测，生成会诊总结：

                {discussions_str}

                症状：{request.symptoms}
                病史：{request.patient_history or 'Not provided'}
                检验结果：{test_results_str or 'Not provided'}

                请用中文回答，控制在150字以内。
                在每个要点之间换行。
                特别强调机器学习模型的预测结果如何支持临床诊断。
                """}
            ]
        )
        return {"diagnosis": summary.choices[0].message.content}
    except Exception as e:
        print(f"Error in get_summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

class TestResult(BaseModel):
    value: str
    unit: str

class ChatRequest(BaseModel):
    symptoms: str
    patient_history: str
    test_results: Dict[str, TestResult]
    chat_stage: str = Field(..., description="One of: symptoms, test_results, diagnosis")

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatResponse(BaseModel):
    messages: List[ChatMessage]

@app.post("/generate-chat")
async def generate_chat(request: ChatRequest):
    try:
        # Format test results for prompt
        test_results_str = "\n".join([
            f"{name}: {result.value} {result.unit}"
            for name, result in request.test_results.items()
        ])
        
        # Create prompt based on chat stage
        if request.chat_stage == "symptoms":
            prompt = f"""
            你是一位经验丰富的医生，正在与疑似Gitelman综合征的患者进行初步问诊。
            诊断流程：
            1. 首先确认是否存在低血钾 (<3.5 mmol/L)
            2. 评估是否存在肾性失钾 (24h尿钾 >20-25 mmol)
            3. 确认是否存在代谢性碱中毒
            4. 评估血压情况（正常或偏低）
            5. 注意发病年龄（青少年或成年发病）和其他特征（低血镁、低尿钙）

            患者主诉：{request.symptoms}
            病史：{request.patient_history}
            
            请按照诊断流程生成一段医生和患者的对话，包括：
            1. 系统询问各项症状
            2. 重点关注发病时间、血压、肌无力等特征
            3. 询问是否有家族史
            
            以对话形式输出，保持自然流畅。每轮对话要简短。
            """
        elif request.chat_stage == "test_results":
            prompt = f"""
            你是一位经验丰富的医生，正在解释检验结果。
            Gitelman综合征的关键检查指标：
            1. 血钾 <3.5 mmol/L
            2. 24h尿钾 >25 mmol（血钾<3.5时）
            3. 代谢性碱中毒（pH升高，碳酸氢根升高）
            4. 血压正常或偏低
            5. 其他指标：低血镁、低尿钙

            患者检验结果：
            {test_results_str}
            
            请生成一段医生解释检验结果的对话，要：
            1. 逐项解释异常指标的含义
            2. 说明这些指标如何支持Gitelman综合征的诊断
            3. 解释是否需要补充其他检查

            以对话形式输出，保持专业性和通俗性的平衡。每轮对话要简短。
            """
        else:
            prompt = f"""
            你是一位经验丰富的医生，正在进行诊断总结。
            Gitelman综合征的诊断要点：
            1. 符合肾性失钾的特征
            2. 存在代谢性碱中毒
            3. 血压正常或偏低
            4. 青少年或成年发病
            5. 需要通过基因诊断最终确诊

            患者情况：
            症状：{request.symptoms}
            检验结果：{test_results_str}
            
            请生成一段关于诊断和建议的对话，包括：
            1. 总结临床表现和检查结果如何支持诊断
            2. 建议进行基因检测确诊
            3. 说明个体化治疗方案：
               - 补充电解质
               - 配合利尿剂、COX抑制剂等用药
               - 规律随访与监测
               - 管理并发症

            以对话形式输出，注意解释专业术语，每轮对话要简短。
            """

        # Get response from LLM
        completion = client.chat.completions.create(
            model="taichu",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": "请生成医生和患者的对话内容，确保对话自然、专业，同时病人容易理解。"}
            ]
        )

        # Parse the response
        raw_response = completion.choices[0].message.content
        messages = []
        
        for line in raw_response.split('\n'):
            line = line.strip()
            if line.startswith('医生：'):
                messages.append(ChatMessage(
                    role="doctor",
                    content=line.replace('医生：', '').strip()
                ))
            elif line.startswith('患者：'):
                messages.append(ChatMessage(
                    role="patient",
                    content=line.replace('患者：', '').strip()
                ))

        return ChatResponse(messages=messages)

    except Exception as e:
        print(f"Error in generate_chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)