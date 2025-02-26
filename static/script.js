// 将discussions定义为全局变量
const discussions = [
    // 第一轮：初步讨论
    {
        doctor1: `从遗传学角度来看，患者的症状高度符合Gitelman综合征的特征。这是一种常染色体隐性遗传病，主要影响SLC12A3基因。建议进行基因检测确认诊断。`,
        doctor2: `但我们需要先排除其他可能导致低钾血症的况。比如，患者是否有长期服用利尿剂或者有严重的腹泻病史？`,
        doctor3: `从实验室检查来看，患者不仅有低钾血症，还伴有低镁血症和代谢性碱中毒，尿钾排泄增加。这些指标都支持Gitelman综合征的诊断。`
    },
    // 第二轮：深入讨论
    {
        doctor1: `我同意检验科的意见。特别是低尿钙的表现，这是区别于Bartter综合征的重要指标。`,
        doctor2: `从肾病科的角度，我们观察到患者的血压偏低，这与肾小管钠离子重吸收障碍相符。但我建议还需要进行醛固酮和肾素活性的检测。`,
        doctor3: `补充一点，患者的血气分析显示代谢性碱中毒，这与远曲小管功能障碍导致的氯离子重吸收缺陷是一致的。`
    },
    // 第三轮：治疗方案讨论
    {
        doctor1: `考虑到这是一个遗传性疾病，我建议对患者的家族成员也进行筛查。`,
        doctor2: `治疗方案上，我建议口服补充氯化钾和硫酸镁，同时适当补充氯化钠。需要定期监测电解质水平。`,
        doctor3: `我建议设定具体的监测指标：血钾维在3.5-4.0mmol/L，血镁维持在0.7-1.0mmol/L。建议每月监测一次，待稳定后可延长至3个月。`
    }
];

let currentRound = 2;

function updateDoctorContent(doctorNum, round) {
    const content = document.querySelector(`#finalDiagnosis${doctorNum} .diagnosis-content`);
    const roundText = document.querySelector(`#finalDiagnosis${doctorNum} .round-text`);
    const prevBtn = document.querySelector(`#finalDiagnosis${doctorNum} .prev-btn`);
    const nextBtn = document.querySelector(`#finalDiagnosis${doctorNum} .next-btn`);
    
    // Update content
    content.innerHTML = `<p class="round-indicator">讨论轮次 ${round + 1}/3</p>` + 
        discussions[round][`doctor${doctorNum}`];
    
    // Update round text
    roundText.textContent = `第${round + 1}轮`;
    
    // Update button states
    prevBtn.disabled = round === 0;
    nextBtn.disabled = round === 2;
}

let currentTestId = 1;

// Global variables for model and scaler
let scalerParams;
let session;
let mlPredictionResult = null; // Global variable to store prediction result

function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
}

function addTestResult() {
    const tbody = document.querySelector('.test-results-table tbody');
    const newRow = document.createElement('tr');
    newRow.className = 'test-result-item';
    newRow.innerHTML = `
        <td>
            <input type="text" class="test-name" placeholder="测试名称">
        </td>
        <td>
            <input type="text" class="test-value" placeholder="R">
        </td>
        <td>
            <input type="text" class="test-unit" placeholder="π">
        </td>
    `;
    tbody.appendChild(newRow);
}

function updateDoctorResponse(message, section) {
    const doctorBubble = section === 'history' 
        ? document.querySelectorAll('.doctor-bubble')[1]  // Second doctor bubble
        : document.querySelectorAll('.doctor-bubble')[0]; // First doctor bubble
    
    doctorBubble.style.opacity = '0';
    
    setTimeout(() => {
        doctorBubble.innerHTML = `<p>${message}</p>`;
        doctorBubble.style.opacity = '1';
    }, 300);
}

async function analyzeSymptoms() {
    const symptoms = document.getElementById('symptoms').value;
    const patientHistory = document.getElementById('patientHistory').value;

    if (!symptoms) {
        alert('请先描述您的症状。');
        return;
    }

    showLoading();

    try {
        const response = await fetch('http://10.200.213.31:8000/analyze-symptoms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                symptoms,
                patient_history: patientHistory
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Error analyzing symptoms');
        }

        const data = await response.json();

        // Format the response for display
        const formattedResponse = formatDoctorResponse(data.analysis);
        updateDoctorResponse(formattedResponse, 'symptoms');

        updateDoctorResponse("请去检验科室做进一步检查", 'history');

    } catch (error) {
        updateDoctorResponse('I apologize, but I encountered an error analyzing your symptoms. Please try again.', 'symptoms');
        console.error('Error:', error);
    } finally {
        hideLoading();
    }
}

function formatDoctorResponse(analysis) {
    return analysis.replace(/\d\./g, '<br>•').replace(/\n/g, ' ');
}

async function getFinalDiagnosis() {
    try {
        // Show loading indicator
        document.getElementById('loadingIndicator').style.display = 'block';

        // Show the diagnosis section
        document.getElementById('diagnosisSection').style.display = 'block';
        
        // Start the consultation display
        showDiagnosisSection();
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Collect test results
        const testResults = {};
        document.querySelectorAll('.test-result-item').forEach(item => {
            const testName = item.querySelector('.test-name').textContent;
            const testValue = item.querySelector('.test-value').value;
            const testUnit = item.querySelector('.test-unit').textContent;
            
            if (testName && testValue) {
                testResults[testName] = {
                    value: testValue,
                    unit: testUnit
                };
            }
        });

        const symptoms = document.getElementById('symptoms').value;
        const patientHistory = document.getElementById('patientHistory').value;

        // Get prediction first
        const features = {
            serum_potassium: parseFloat(testResults['血钾'].value),
            urine_potassium: parseFloat(testResults['尿钾'].value),
            high_blood_pressure: testResults['高血压(yes/no)'].value.toLowerCase() === 'yes' ? 1 : 0,
            PH: parseFloat(testResults['pH值'].value),
            bicarbonate: parseFloat(testResults['标准碳酸氢根'].value)
        };

        console.log("ML Features:", features);
        mlPredictionResult = await makePrediction(features);
        console.log("ML Prediction:", mlPredictionResult);

        // Add prediction to request data
        const requestData = {
            symptoms,
            patient_history: patientHistory,
            test_results: testResults,
            ml_prediction: mlPredictionResult
        };

        // Initialize navigation buttons
        attachNavigationListeners();

        // Round 1: Initial Discussion
        await new Promise(resolve => setTimeout(resolve, 4000));
        updateConsultationProgress(0);

        // Get Genetic Opinion
        const geneticResponse = await fetch('http://10.200.213.31:8000/genetic-opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        const geneticData = await geneticResponse.json();
        document.querySelector('#finalDiagnosis1 .diagnosis-content').innerHTML = 
            `<p class="round-indicator">讨论轮次 1/3</p>` + geneticData.diagnosis;
        
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // Get Treatment Opinion
        const treatmentResponse = await fetch('http://10.200.213.31:8000/treatment-opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        const treatmentData = await treatmentResponse.json();
        document.querySelector('#finalDiagnosis2 .diagnosis-content').innerHTML = 
            `<p class="round-indicator">讨论轮次 1/3</p>` + treatmentData.diagnosis;
        
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // Get Lab Opinion
        const labResponse = await fetch('http://10.200.213.31:8000/lab-opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        const labData = await labResponse.json();
        document.querySelector('#finalDiagnosis3 .diagnosis-content').innerHTML = 
            `<p class="round-indicator">讨论轮次 1/3</p>` + labData.diagnosis;

        // Round 2: Further Discussion
        await new Promise(resolve => setTimeout(resolve, 4000));
        updateConsultationProgress(1);
        updateAllRoundTexts(1);

        // Round 2: Get updated opinions with new context
        const round2Data = {
            ...requestData,
            round: 2,
            previous_opinions: {
                genetic: geneticData.diagnosis,
                treatment: treatmentData.diagnosis,
                lab: labData.diagnosis
            }
        };

        // Get Genetic Opinion - Round 2
        const geneticResponse2 = await fetch('http://10.200.213.31:8000/genetic-opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(round2Data)
        });
        const geneticData2 = await geneticResponse2.json();
        document.querySelector('#finalDiagnosis1 .diagnosis-content').innerHTML = 
            `<p class="round-indicator">讨论轮次 2/3</p>` + geneticData2.diagnosis;

        await new Promise(resolve => setTimeout(resolve, 4000));

        // Get Treatment Opinion - Round 2
        const treatmentResponse2 = await fetch('http://10.200.213.31:8000/treatment-opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(round2Data)
        });
        const treatmentData2 = await treatmentResponse2.json();
        document.querySelector('#finalDiagnosis2 .diagnosis-content').innerHTML = 
            `<p class="round-indicator">讨论轮次 2/3</p>` + treatmentData2.diagnosis;

        await new Promise(resolve => setTimeout(resolve, 4000));

        // Get Lab Opinion - Round 2
        const labResponse2 = await fetch('http://10.200.213.31:8000/lab-opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(round2Data)
        });
        const labData2 = await labResponse2.json();
        document.querySelector('#finalDiagnosis3 .diagnosis-content').innerHTML = 
            `<p class="round-indicator">讨论轮次 2/3</p>` + labData2.diagnosis;

        // Round 3: Treatment Discussion
        await new Promise(resolve => setTimeout(resolve, 4000));
        updateConsultationProgress(2);
        updateAllRoundTexts(2);

        // Round 3: Get final opinions with all previous context
        const round3Data = {
            ...requestData,
            round: 3,
            previous_opinions: {
                round1: {
                    genetic: geneticData.diagnosis,
                    treatment: treatmentData.diagnosis,
                    lab: labData.diagnosis
                },
                round2: {
                    genetic: geneticData2.diagnosis,
                    treatment: treatmentData2.diagnosis,
                    lab: labData2.diagnosis
                }
            }
        };

        // Get Genetic Opinion - Round 3
        const geneticResponse3 = await fetch('http://10.200.213.31:8000/genetic-opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(round3Data)
        });
        const geneticData3 = await geneticResponse3.json();
        document.querySelector('#finalDiagnosis1 .diagnosis-content').innerHTML = 
            `<p class="round-indicator">讨论轮次 3/3</p>` + geneticData3.diagnosis;

        await new Promise(resolve => setTimeout(resolve, 4000));

        // Get Treatment Opinion - Round 3
        const treatmentResponse3 = await fetch('http://10.200.213.31:8000/treatment-opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(round3Data)
        });
        const treatmentData3 = await treatmentResponse3.json();
        document.querySelector('#finalDiagnosis2 .diagnosis-content').innerHTML = 
            `<p class="round-indicator">讨论轮次 3/3</p>` + treatmentData3.diagnosis;

        await new Promise(resolve => setTimeout(resolve, 4000));

        // Get Lab Opinion - Round 3
        const labResponse3 = await fetch('http://10.200.213.31:8000/lab-opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(round3Data)
        });
        const labData3 = await labResponse3.json();
        document.querySelector('#finalDiagnosis3 .diagnosis-content').innerHTML = 
            `<p class="round-indicator">讨论轮次 3/3</p>` + labData3.diagnosis;

        // Final Summary
        await new Promise(resolve => setTimeout(resolve, 3000));
        updateConsultationProgress(3);

        // Get final summary from the backend ---
        // const summaryResponse = await fetch('http://10.200.213.31:8000/summary', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(requestData)
        // });
        // const summaryData = await summaryResponse.json();

        // const aiHostSummary = document.querySelector('#aiHostSummary .diagnosis-content');
        // aiHostSummary.innerHTML = summaryData.diagnosis;
        // aiHostSummary.style.display = 'block';
        // ---

        // --- fix summary ---
        const aiHostSummary = document.querySelector('#aiHostSummary .diagnosis-content');
        aiHostSummary.innerHTML = `
            <p>感谢各位专家的深入讨论。经过三轮会诊，我们达成以下共识：</p>
            <ol>
                <li>诊断：临床表现和实验室检查<strong>高度支持Gitelman综合症的诊断</strong></li>
                <li><strong>基因诊断</strong>：建议进行SLC12A3基因检测以明确诊断。</li>
                <li><strong>需要个性化治疗方案</strong>：先建议饮食补充，鼓励多进食含盐饮食，多食用富含钾、镁的食物。药物补充方面，补钾建议采用氯化钾，补镁建议采用有机酸盐制剂；严重低钾血症或低镁血症者可予静脉补充；必要时可考虑联合用药。随访计划：患者应每3～6个月随诊1次，评估相关症状、肾功能和电解质水平、并发症情况等，调整药物治疗方案。生活建议：合理饮食作息，保持心情舒畅，在大量出汗、腹泻或呕吐时需及时补充电解质，避免发生严重并发症。
                </li>
            </ol>
        `;
        aiHostSummary.style.display = 'block';
        // ---
    } catch (error) {
        console.error('Detailed error:', error);
        alert('诊断过程出错: ' + error.message);
    } finally {
        document.getElementById('loadingIndicator').style.display = 'none';
    }
}

function startConsultation() {
    // Show initial scene
    document.querySelector('.initial-scene').classList.remove('hidden');
    
    // // After 3 seconds, show host invitation
    // setTimeout(() => {
    //     document.querySelector('.host-invitation').classList.remove('hidden');
    // }, 3000);

    // After 6 seconds, show consultation room
    setTimeout(() => {
        document.querySelector('.consultation-room').classList.remove('hidden');
    }, 5000);
}

// Call this function when entering the diagnosis section
function showDiagnosisSection() {
    startConsultation();
}

function attachNavigationListeners() {
    for (let doctorNum = 1; doctorNum <= 3; doctorNum++) {
        const prevBtn = document.querySelector(`#finalDiagnosis${doctorNum} .prev-btn`);
        const nextBtn = document.querySelector(`#finalDiagnosis${doctorNum} .next-btn`);
        
        prevBtn.addEventListener('click', () => {
            if (currentRound > 0) {
                currentRound--;
                updateDoctorContent(doctorNum, currentRound);
            }
        });
        
        nextBtn.addEventListener('click', () => {
            if (currentRound < 2) {
                currentRound++;
                updateDoctorContent(doctorNum, currentRound);
            }
        });
    }
}

// Add this new function to update all round texts
function updateAllRoundTexts(round) {
    document.querySelectorAll('.round-text').forEach(text => {
        text.textContent = `第${round + 1}轮`;
    });
}

async function getFinalDiagnosis_fix() {
    // Show loading indicator if you have one
    document.getElementById('loadingIndicator').style.display = 'block';

    // Show the diagnosis section
    document.getElementById('diagnosisSection').style.display = 'block';
    
    // Start the sequential consultation display
    showDiagnosisSection();
    await new Promise(resolve => setTimeout(resolve, 5000));


    try {
        // 初始化导航按钮
        attachNavigationListeners();
        // 逐轮显示讨论内容
        for (let round = 0; round < discussions.length; round++) {
            await new Promise(resolve => setTimeout(resolve, 4000)); // 各轮之间的间隔
            
            // Update progress to current round
            updateConsultationProgress(round); // This will show round 0, 1, or 2
            updateAllRoundTexts(round);

            // Update three doctors' speeches
            document.querySelector('#finalDiagnosis1 .diagnosis-content').innerHTML = 
                `<p class="round-indicator">讨论轮次 ${round + 1}/3</p>` + discussions[round].doctor1;
            
            await new Promise(resolve => setTimeout(resolve, 4000));
                        
            document.querySelector('#finalDiagnosis2 .diagnosis-content').innerHTML = 
                `<p class="round-indicator">讨论轮次 ${round + 1}/3</p>` + discussions[round].doctor2;
            
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            document.querySelector('#finalDiagnosis3 .diagnosis-content').innerHTML = 
                `<p class="round-indicator">讨论轮次 ${round + 1}/3</p>` + discussions[round].doctor3;
        }

        // After the loop, when showing AI host summary
        await new Promise(resolve => setTimeout(resolve, 3000));
        updateConsultationProgress(3); // This will show the final summary step

        const aiHostSummary = document.querySelector('#aiHostSummary .diagnosis-content');
        aiHostSummary.innerHTML = `
            <p>感谢各位专家的深入讨论。经过三轮会诊，我们达成以下共识：</p>
            <ol>
                <li>诊断：结合AI模型72%的诊断概率，临床表现和实验室检查<strong>高度支持Gitelman综合症的诊断</strong></li>
                <li><strong>基因诊断</strong>：建议进行SLC12A3基因检测以进一步确认诊断</li>
                <li><strong>需要个性化治疗方案</strong>：补充电解质，口服补充钾剂和镁剂，适量氯化钠; 规律随访，监测电解质和肾功能;管理慢性并发症
                </li>
            </ol>
        `;
        aiHostSummary.style.display = 'block';

    } catch (error) {
        console.error('Error:', error);
        alert('Error getting diagnosis: ' + error.message);
    }
}

/**
 * Displays all doctor images by setting their display style to 'block'.
 */
function showAllDoctorImages() {
    const doctorImages = document.querySelectorAll('.doctor-position .character-image');
    doctorImages.forEach(image => {
        image.style.display = 'block';
        image.style.opacity = '1';
    });
}

/**
 * Displays the doctor's diagnosis in a chat bubble after a specified delay.
 * 
 * @param {string} doctorId - The ID of the doctor's chat bubble element.
 * @param {string} diagnosis - The diagnosis message to display.
 * @param {number} delay - Delay in milliseconds before showing the diagnosis.
 */
async function showDoctorDiagnosis(doctorId, diagnosis, delay) {
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const doctorElement = document.getElementById(doctorId);
    const doctorPosition = doctorElement.closest('.doctor-position');
    
    doctorPosition.classList.add('active'); // Add active class for potential animations
    
    return new Promise(resolve => {
        setTimeout(() => {
            doctorElement.querySelector('.diagnosis-content').innerHTML = diagnosis;
            doctorElement.classList.add('active'); // Reveal the chat bubble
            resolve();
        }, 500); // Duration for chat bubble animation/display
    });
}

function navigateToSection(section) {
    // Get all sections
    const symptomsSection = document.getElementById('symptomsSection');
    const testsSection = document.getElementById('testsSection');
    const diagnosisSection = document.getElementById('diagnosisSection');
    const predictionSection = document.getElementById('predictionSection');
    const chatSection = document.getElementById('ch');

    // // Check if navigation should be allowed
    // if (section === 'tests' && !testsSection.style.display) {
    //     alert('Please complete the symptoms analysis first.');
    //     return;
    // }
    // if (section === 'diagnosis' && !diagnosisSection.style.display) {
    //     alert('Please complete the lab tests first.');
    //     return;
    // }

    // Perform the navigation
    switch(section) {
        case 'symptoms':
            symptomsSection.scrollIntoView({ behavior: 'smooth' });
            break;
        case 'tests':
            // if (testsSection.style.display !== 'none') {
            //     testsSection.scrollIntoView({ behavior: 'smooth' });
            // }
            testsSection.scrollIntoView({ behavior: 'smooth' });
            break;
        case 'diagnosis':
            // if (diagnosisSection.style.display !== 'none') {
            //     diagnosisSection.scrollIntoView({ behavior: 'smooth' });
            // }
            diagnosisSection.scrollIntoView({ behavior: 'smooth' });
            break;
        case 'prediction':
            // if (diagnosisSection.style.display !== 'none') {
            //     diagnosisSection.scrollIntoView({ behavior: 'smooth' });
            // }
            predictionSection.scrollIntoView({ behavior: 'smooth' });
            break; 
        case 'chat':
            chatSection.scrollIntoView({ behavior: 'smooth' });
            break;
    }
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initially disable steps 2 and 3
    // document.getElementById('step2').classList.add('disabled');
    // document.getElementById('step3').classList.add('disabled');
    
    // Show doctor images when page loads
    showAllDoctorImages();
});

// Load model and scaler parameters
async function loadModel() {
    try {
        console.log('Starting to load model...');
        
        console.log('Fetching scaler params...');
        const scalerResponse = await fetch('http://10.200.213.31:8000/api/scaler-params');
        if (!scalerResponse.ok) {
            throw new Error(`Failed to fetch scaler params: ${scalerResponse.status}`);
        }
        scalerParams = await scalerResponse.json();
        console.log('Scaler params loaded:', scalerParams);
        
        console.log('Loading ONNX model...');
        session = await ort.InferenceSession.create('http://10.200.213.31:8000/static/model.onnx');
        console.log('ONNX model loaded successfully');
        
    } catch (error) {
        console.error('Detailed model loading error:', error);
        throw error;
    }
}

// Standardize features using saved scaler parameters
function standardize(features) {
    return [
        features.serum_potassium,
        features.urine_potassium,
        features.PH,
        features.bicarbonate,
        features.high_blood_pressure
    ].map((value, index) => {
        return (value - scalerParams.mean_[index]) / scalerParams.scale_[index];
    });
}

// Main prediction function
async function makePrediction(features) {
    try {
        const response = await fetch('http://10.200.213.31:8000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(features)
        });

        if (!response.ok) {
            throw new Error('Prediction request failed');
        }

        const result = await response.json();
        return result.probability;
    } catch (error) {
        console.error('Prediction error:', error);
        throw error;
    }
}

// Define mapping of Chinese names to English variable names
const nameMapping = {
    '血钾': 'serum_potassium',
    '尿钾': 'urine_potassium',
    '高血压(yes/no)': 'high_blood_pressure',
    'pH值': 'PH',
    '标准碳酸氢根': 'bicarbonate'
};

async function loadModelAndPredict() {
    try {
        // Reset prediction display
        const probabilityFill = document.querySelector('.probability-fill');
        const probabilityValue = document.querySelector('.probability-value');
        const resultInterpretation = document.querySelector('.result-interpretation');
        
        probabilityFill.style.width = '0%';
        probabilityValue.textContent = '0%';
        resultInterpretation.textContent = '正在分析中...';

        showLoading();
        
        // Get values from lab test section
        const testValues = {
            '血钾': { value: document.querySelector('input[type="text"].test-value').value },
            '尿钾': { value: document.querySelectorAll('input[type="text"].test-value')[1].value },
            '高血压': { value: document.querySelectorAll('input[type="text"].test-value')[2].value },
            'ph值': { value: document.querySelectorAll('input[type="text"].test-value')[3].value },
            '标准碳酸氢根': { value: document.querySelectorAll('input[type="text"].test-value')[4].value }
        };

        // Validate if all values are entered
        for (const [name, data] of Object.entries(testValues)) {
            if (!data.value) {
                throw new Error(`请输入${name}的值`);
            }
        }
        
        // Get all rows from the feature table
        const tableRows = document.querySelectorAll('.feature-table tr');
        
        // Skip the header row (index 0)
        for (let i = 1; i < tableRows.length; i++) {
            const row = tableRows[i];
            const nameCell = row.cells[0];
            const valueCell = row.cells[1];
            const statusSpan = row.querySelector('.status');
            
            // Get test name without unit
            const testName = nameCell.textContent.split(' ')[0];
            
            if (testValues[testName]) {
                // Add delay for visual effect
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Update value
                valueCell.textContent = testValues[testName].value;
                
                // Update status
                if (statusSpan) {
                    if (testName === '高血压') {
                        const isNormal = testValues[testName].value.toLowerCase() === 'no';
                        statusSpan.textContent = isNormal ? '正常' : '异常';
                        statusSpan.className = `status ${isNormal ? 'normal' : 'abnormal'}`;
                    } else {
                        const value = parseFloat(testValues[testName].value);
                        const isNormal = (testName === '血钾' && value >= 3.5 && value <= 5.5) ||
                                       (testName === '尿钾' && value <= 180) ||
                                       (testName === 'ph值' && value >= 7.35 && value <= 7.45) ||
                                       (testName === '标准碳酸氢根' && value >= 24 && value <= 28);
                        
                        statusSpan.textContent = isNormal ? '正常' : '异常';
                        statusSpan.className = `status ${isNormal ? 'normal' : 'abnormal'}`;
                    }
                }
            }
        }

        // Create features object for prediction
        const features = {
            serum_potassium: parseFloat(testValues['血钾'].value),
            urine_potassium: parseFloat(testValues['尿钾'].value),
            high_blood_pressure: testValues['高血压'].value.toLowerCase() === 'yes' ? 1 : 0,
            PH: parseFloat(testValues['ph值'].value),
            bicarbonate: parseFloat(testValues['标准碳酸氢根'].value)
        };

        console.log(features);
        
        // Add delay before making prediction
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const prediction = await makePrediction(features);
        
        // Add delay before showing prediction results
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update prediction display
        updatePredictionDisplay(prediction);
        // resultInterpretation.textContent = `基于机器学习模型预测，患者患有 Gitelman 综合征的概率为 ${(prediction * 100).toFixed(0)}%。建议进行多学科会诊，进一步确认诊断。`;
        
    } catch (error) {
        console.error('预测过程出错:', error);
        alert('预测失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Helper function to determine status
function getStatus(testName, value) {
    switch(testName) {
        case '血钾':
            return (value < 3.5 || value > 5.5) 
                ? {text: '异常', class: 'abnormal'} 
                : {text: '正常', class: 'normal'};
        case '尿钾':
            return (value < 25 || value > 125)
                ? {text: '异常', class: 'abnormal'} 
                : {text: '正常', class: 'normal'};
        case '高血压(yes/no)':
            return value.toLowerCase() === 'yes'
                ? {text: '异常', class: 'abnormal'} 
                : {text: '正常', class: 'normal'};
        case 'ph值':
            return (value < 7.35 || value > 7.45)
                ? {text: '异常', class: 'abnormal'} 
                : {text: '正常', class: 'normal'};
        case '标准碳酸氢根':
            return (value < 22 || value > 27)
                ? {text: '异常', class: 'abnormal'} 
                : {text: '正常', class: 'normal'};
        default:
            return {text: '正常', class: 'normal'};
    }
}

// Update prediction display
function updatePredictionDisplay(probability) {
    const probabilityFill = document.querySelector('.probability-fill');
    const probabilityValue = document.querySelector('.probability-value');
    const resultInterpretation = document.querySelector('.result-interpretation');
    
    probabilityFill.style.width = `${probability * 100}%`;
    probabilityValue.textContent = `${(probability * 100).toFixed(0)}%`;
    
    // Update interpretation text with the new probability
    if (probability < 0.3) {
        resultInterpretation.textContent = `基于机器学习模型预测，患者患有 Gitelman 综合征的概率为 ${(probability * 100).toFixed(0)}%。
        无需进行多学科会诊。`;
    } else {    
        resultInterpretation.textContent = `基于机器学习模型预测，患者患有 Gitelman 综合征的概率为 ${(probability * 100).toFixed(0)}%。
        建议进行多学科会诊，进一步确认诊断。`;
    }
}

// Chat section display
// function showChatSection_fix() {
//     const chatSection = document.getElementById('chatSection');
//     chatSection.style.display = 'block';
    
//     const messages = document.querySelectorAll('.chat-message');
//     let currentIndex = 0;

//     function showNextMessage() {
//         if (currentIndex < messages.length) {
//             const message = messages[currentIndex];
//             message.classList.remove('hidden');
            
//             setTimeout(() => {
//                 message.classList.add('show');
//             }, 50);

//             currentIndex++;
            
//             const messageLength = message.querySelector('.message-content').textContent.length;
//             const delay = Math.max(1000, messageLength * 30);
            
//             setTimeout(showNextMessage, delay);
//         } else {
//             // setTimeout(() => {
//             //     document.getElementById('predictionSection').style.display = 'block';
//             //     loadModelAndPredict();
//             // }, 1000);
//         }
//     }

//     showNextMessage();
// }


async function displayChatMessages(messages) {
    if (!Array.isArray(messages)) {
        console.error('Invalid messages format:', messages);
        return;
    }

    for (const message of messages) {
        if (!message || !message.role || !message.content) {
            console.error('Invalid message format:', message);
            continue;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.role}-message hidden`;
        
        messageDiv.innerHTML = `
            <div class="avatar">
                <img src="/static/images/${message.role === 'doctor' ? 'doctor1.png' : 'patient.png'}" alt="${message.role}">
            </div>
            <div class="message-content">
                ${message.content}
            </div>
        `;
        
        document.querySelector('.chat-container').appendChild(messageDiv);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        messageDiv.classList.remove('hidden');
        
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
}

// Modify your existing showChatSection function
async function showChatSection() {
    try {
        // Get values from the form with default values if empty
        const symptoms = document.getElementById('symptoms').value || "患者出现低钾血症，伴有手脚麻木，肌肉无力等症状";
        const patientHistory = document.getElementById('patientHistory').value || "无特殊病史";
        
        // Collect test results with default values
        const testResults = {
            "血钾": { value: "2.8", unit: "mmol/L" },
            "尿钾": { value: "95", unit: "mmol/24h" },
            "血压": { value: "110/70", unit: "mmHg" },
            "pH值": { value: "7.5", unit: "" },
            "碳酸氢根": { value: "32", unit: "mmol/L" }
        };

        // Try to get actual values if they exist
        document.querySelectorAll('.test-result-item').forEach(item => {
            const testName = item.querySelector('.test-name').textContent;
            const testValue = item.querySelector('.test-value').value;
            const testUnit = item.querySelector('.test-unit').textContent;
            
            if (testName && testValue) {
                testResults[testName] = {
                    value: testValue,
                    unit: testUnit
                };
            }
        });

        const requestData = {
            symptoms,
            patient_history: patientHistory,
            test_results: testResults,
            chat_stage: 'symptoms'  // Initial stage
        };

        console.log("Sending request data:", JSON.stringify(requestData, null, 2));

        // Clear existing chat messages
        const chatContainer = document.querySelector('.chat-container');
        chatContainer.innerHTML = '';

        // Initial symptoms discussion
        console.log("Fetching symptoms discussion...");
        const symptomsResponse = await fetch('http://10.200.213.31:8000/generate-chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!symptomsResponse.ok) {
            const errorText = await symptomsResponse.text();
            throw new Error(`Symptoms API error: ${errorText}`);
        }

        const symptomsChat = await symptomsResponse.json();
        console.log("Received symptoms chat:", symptomsChat);
        
        if (!symptomsChat.messages || !Array.isArray(symptomsChat.messages)) {
            throw new Error('Invalid response format: messages array not found');
        }

        await displayChatMessages(symptomsChat.messages);

        // Wait between sections
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test results discussion
        const testResultsResponse = await fetch('http://10.200.213.31:8000/generate-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...requestData,
                chat_stage: 'test_results'
            })
        });
        const testResultsChat = await testResultsResponse.json();
        console.log("Received test_results chat:", testResultsChat);
        await displayChatMessages(testResultsChat.messages);

        // Wait between sections
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Diagnosis and recommendations
        const diagnosisResponse = await fetch('http://10.200.213.31:8000/generate-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...requestData,
                chat_stage: 'diagnosis'
            })
        });
        const diagnosisChat = await diagnosisResponse.json();
        console.log("Received diagnosis chat:", diagnosisChat);
        await displayChatMessages(diagnosisChat.messages);

        // Show the chat section
        document.getElementById('chatSection').style.display = 'block';

    } catch (error) {
        console.error('Detailed error:', error);
        alert('生成对话内容时出错: ' + error.message);
    }
}


// AI prompt display
function showAIPrompt() {
    const promptSection = document.getElementById('promptSection');
    promptSection.style.display = 'block';
    
    const nodes = promptSection.querySelectorAll('.tree-node');
    nodes.forEach((node, index) => {
        setTimeout(() => {
            node.style.opacity = '1';
        }, index * 300);
    });
}

// // Initialize on page load
// document.addEventListener('DOMContentLoaded', loadModelAndPredict);

function updateConsultationProgress(step) {
    const steps = document.querySelectorAll('.progress-step');
    const clockHand = document.querySelector('.clock-hand');
    
    // Reset all steps
    steps.forEach(s => s.classList.remove('active'));
    
    // Activate current step
    if (step >= 0 && step < steps.length) {
        steps[step].classList.add('active');
        
        // Rotate clock hand (120 degrees per step for first 3 rounds, then to 360 for summary)
        let rotation;
        if (step < 3) {
            rotation = step * 120; // 120 degrees per round (360/3 rounds)
        } else {
            rotation = 360; // Full rotation for summary
        }
        
        // Update only the rotation part of the transform
        clockHand.style.transform = `translate(-50%, 0) rotate(${rotation}deg)`;
        
        // Debug log
        console.log(`Step ${step}: Rotating to ${rotation} degrees`);
    }
}