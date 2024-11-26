# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, List
import openai
from openai import OpenAI
import os
from datetime import datetime

app = FastAPI()

# Configure CORS - more specific settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure OpenAI
# Replace this with your actual OpenAI API key
client = OpenAI(
    api_key="sk-HkrcTbpXxSmXuBRviOp43r9RV8mncrELLpR3lyEoo6jnERW2",  # 在这里将 MOONSHOT_API_KEY 替换为你从 Kimi 开放平台申请的 API Key
    base_url="https://api.moonshot.cn/v1",
)

# openai.api_key = "sk-FO3yus4aQ3OLusojMZXp26LXHiTZFv6pnPDNtDT70pTIeeAG"


class DiagnosisRequest(BaseModel):
    symptoms: str
    test_results: Optional[Dict[str, str]] = None
    patient_history: Optional[str] = None


@app.get("/")
async def root():
    return {"message": "Medical Diagnosis API is running"}


@app.post("/analyze-symptoms")
async def analyze_symptoms(request: DiagnosisRequest):
    # if not openai.api_key:
    #     raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    try:
        # openai.ChatCompletion.create
        completion = client.chat.completions.create(
            model="moonshot-v1-8k",  # or "gpt-3.5-turbo" if you have access
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
        
        first_opinion = client.chat.completions.create(
            model="moonshot-v1-8k",
            messages=[
                {"role": "system", 
                 "content": """You are Dr. Smith, a genetic specialist focusing on hereditary kidney disorders.
                 For Gitelman syndrome diagnosis, consider:
                 1. Age of onset (青少年或成年发病)
                 2. Family history (家族史)
                 3. Genetic testing recommendations (SLC12A3基因)
                 4. Differential diagnosis from Bartter syndrome"""},
                {"role": "user", "content": f"""
                请分析以下病例是否符合 Gitelman 综合征的遗传特征：
                症状：{request.symptoms}
                病史：{request.patient_history or 'Not provided'}
                检验结果：{test_results_str or 'Not provided'}

                请提供以下分析：
                1. 遗传可能性分析：
                   - 发病年龄特征
                   - 家族史特征
                   - 与 Gitelman 综合征的符合程度
                
                2. 推荐的遗传检测：
                   - SLC12A3基因突变检测必要性
                   - 家族成员筛查建议
                
                3. 诊断依据：
                   请明确列出支持 Gitelman 综合征诊断的遗传学依据

                请用中文回答，控制在150字以内。
                在每个要点之间换行。
                """}
            ]
        )
        return {"diagnosis": first_opinion.choices[0].message.content}
    except Exception as e:
        print(f"Error in get_genetic_opinion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lab-opinion")
async def get_lab_opinion(request: DiagnosisRequest):
    try:
        test_results_str = "\n".join([f"{k}: {v}" for k, v in (request.test_results or {}).items()])
        
        third_opinion = client.chat.completions.create(
            model="moonshot-v1-8k",
            messages=[
                {"role": "system", 
                 "content": """You are Dr. Chen, a laboratory medicine specialist. 
                 Follow this diagnostic pathway for Gitelman syndrome:
                 1. Primary criteria:
                    - 低血钾: K+ < 3.5 mmol/L
                    - 肾性失钾: 24h尿钾 > 20mmol (当K+ < 3.0mmol/L时)
                              24h尿钾 > 25mmol (当K+ < 3.5mmol/L时)
                 2. Supporting criteria:
                    - 代谢性碱中毒
                    - 血压正常或偏低
                    - 低血镁
                    - 低尿钙"""},
                {"role": "user", "content": f"""
                请分析以下检验结果：
                症状：{request.symptoms}
                病史：{request.patient_history or 'Not provided'}
                检验结果：{test_results_str or 'Not provided'}

                请提供以下分析：
                1. 主要诊断指标分析：
                   - 血钾水平及肾性失钾评估
                   - 血气分析结果
                   - 血压情况
                
                2. 辅助诊断指标分析：
                   - 血镁水平
                   - 尿钙水平
                   - 其他电解质异常
                
                3. 诊断依据：
                   请明确列出符合和不符合Gitelman综合征诊断的实验室检查证据

                请用中文回答，控制在150字以内。
                在每个要点之间换行。
                """}
            ]
        )
        return {"diagnosis": third_opinion.choices[0].message.content}
    except Exception as e:
        print(f"Error in get_lab_opinion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/treatment-opinion")
async def get_treatment_opinion(request: DiagnosisRequest):
    try:
        test_results_str = "\n".join([f"{k}: {v}" for k, v in (request.test_results or {}).items()])
        
        second_opinion = client.chat.completions.create(
            model="moonshot-v1-8k",
            messages=[
                {"role": "system", 
                 "content": """You are Dr. Johnson, a treatment specialist.
                 Follow these treatment principles for Gitelman syndrome:
                 1. 个体化治疗评估标准：
                    - 电解质补充需求
                    - 是否需要联合用药
                    - 随访监测要求
                    - 并发症管理
                 2. 治疗方案包括：
                    - 补充电解质
                    - 酌情联合保钾利尿剂、COX抑制剂、ACEI/ARB
                    - 规律随访与监测
                    - 管理慢性并发症"""},
                {"role": "user", "content": f"""
                基于以下患者信息制定治疗方案：
                症状：{request.symptoms}
                病史：{request.patient_history or 'Not provided'}
                检验结果：{test_results_str or 'Not provided'}

                请提供以下分析：
                1. 治疗方案选择依据：
                   - 症状严重程度评估
                   - 电解质紊乱程度
                   - 并发症风险评估
                
                2. 具体治疗建议：
                   - 电解质补充方案
                   - 是否需要联合用药
                   - 随访监测计划
                
                3. 治疗方案依据：
                   请说明选择该治疗方案的具体原因

                请用中文回答，控制在150字以内。
                在每个要点之间换行。
                """}
            ]
        )
        return {"diagnosis": second_opinion.choices[0].message.content}
    except Exception as e:
        print(f"Error in get_treatment_opinion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)