let currentTestId = 1;

// Global variables for model and scaler
let scalerParams;
let session;

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
        const response = await fetch('http://localhost:8000/analyze-symptoms', {
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
    const symptoms = document.getElementById('symptoms').value;
    const patientHistory = document.getElementById('patientHistory').value;
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

    const requestData = {
        symptoms,
        patient_history: patientHistory,
        test_results: testResults
    };

    console.log(requestData);

    document.getElementById('diagnosisSection').style.display = 'block';
    
    // Step 1: Show all doctor images
    // showAllDoctorImages();

    try {
        // Step 2: Sequentially fetch and display diagnoses

        // Get Genetic Opinion
        const geneticResponse = await fetch('http://localhost:8000/genetic-opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        const geneticData = await geneticResponse.json();
        await showDoctorDiagnosis('finalDiagnosis1', geneticData.diagnosis, 0);

        // Wait 1 second before next request
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get Treatment Opinion
        const treatmentResponse = await fetch('http://localhost:8000/treatment-opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        const treatmentData = await treatmentResponse.json();
        await showDoctorDiagnosis('finalDiagnosis2', treatmentData.diagnosis, 500);

        // Wait 1 second before next request
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get Lab Opinion
        const labResponse = await fetch('http://localhost:8000/lab-opinion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        const labData = await labResponse.json();
        await showDoctorDiagnosis('finalDiagnosis3', labData.diagnosis, 500);

        // 添加AI主持医生的总结
        setTimeout(() => {
            const aiHostSummary = document.querySelector('#aiHostSummary .diagnosis-content');
            aiHostSummary.innerHTML = `
                <p>各位专家，感谢您们的专业意见。让我来总结一下本次会诊的主要结论：</p>
                <ol>
                    <li>根据患者的临床表现和实验室检查结果，确诊为Gitelman综合征；</li>
                    <li>基因诊断：建议进行SLC12A3基因检测以进一步确认诊断；</li>
                    <li>治疗方案包括：
                        <ul>
                            <li>口服补充钾剂和镁剂</li>
                            <li>定期监测电解质</li>
                            <li>适当补充氯化钠</li>
                        </ul>
                    </li>
                    <li>建议每3个月随访一次，监测电解质和肾功能。</li>
                </ol>
                <p>请问各位专家对这个总结有补充意见吗？</p>
            `;
            aiHostSummary.style.display = 'block';
        }, 4500); // 在三位专家发言后显示

        // 显示病人回应
        // setTimeout(() => {
        //     const patientResponse = document.getElementById('patientResponse');
        //     patientResponse.classList.remove('hidden');
        //     patientResponse.classList.add('show');
        // }, 6000); // 在AI主持总结后显示

        // updateSteps(4);
    } catch (error) {
        console.error('Error:', error);
        alert('Error getting diagnosis: ' + error.message);
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
    }, 6000);
}

// Call this function when entering the diagnosis section
function showDiagnosisSection() {
    startConsultation();
}

async function getFinalDiagnosis_fix() {
    // Show loading indicator if you have one
    document.getElementById('loadingIndicator').style.display = 'block';

    // Show the diagnosis section
    document.getElementById('diagnosisSection').style.display = 'block';
    
    // Start the sequential consultation display
    showDiagnosisSection();

    try {
        const discussions = [
            // 第一轮：初步诊断
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

        await new Promise(resolve => setTimeout(resolve, 8000));

        // 逐轮显示讨论内容
        for (let round = 0; round < discussions.length; round++) {
            await new Promise(resolve => setTimeout(resolve, 4000)); // 各轮之间的间隔
            
            // Update progress to current round
            updateConsultationProgress(round); // This will show round 0, 1, or 2

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
                <li>诊断：临床表现和实验室检查<strong>高度支持Gitelman综合征的诊断</strong></li>
                <li><strong>基因诊断</strong>：建议进行SLC12A3基因检测以进一步确认诊断</li>
                <li><strong>需要个性化治疗方案</strong>：例如补充电解质; 联合保钾利尿剂、COX抑制剂、ACEI/ARB；规律随访与监测;管理慢性并发症
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
        const scalerResponse = await fetch('http://localhost:8000/api/scaler-params');
        if (!scalerResponse.ok) {
            throw new Error(`Failed to fetch scaler params: ${scalerResponse.status}`);
        }
        scalerParams = await scalerResponse.json();
        console.log('Scaler params loaded:', scalerParams);
        
        console.log('Loading ONNX model...');
        session = await ort.InferenceSession.create('http://localhost:8000/static/model.onnx');
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
        const response = await fetch('http://localhost:8000/predict', {
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
                await new Promise(resolve => setTimeout(resolve, 500));
                
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
        
        // Add delay before making prediction
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const prediction = await makePrediction(features);
        
        // Add delay before showing prediction results
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update prediction display
        updatePredictionDisplay(prediction);
        resultInterpretation.textContent = `基于机器学习模型预测，患者患有 Gitelman 综合征的概率为 ${(prediction * 100).toFixed(0)}%。建议进行多学科会诊，进一步确认诊断。`;
        
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
function showChatSection() {
    const chatSection = document.getElementById('chatSection');
    chatSection.style.display = 'block';
    
    const messages = document.querySelectorAll('.chat-message');
    let currentIndex = 0;

    function showNextMessage() {
        if (currentIndex < messages.length) {
            const message = messages[currentIndex];
            message.classList.remove('hidden');
            
            setTimeout(() => {
                message.classList.add('show');
            }, 50);

            currentIndex++;
            
            const messageLength = message.querySelector('.message-content').textContent.length;
            const delay = Math.max(1000, messageLength * 30);
            
            setTimeout(showNextMessage, delay);
        } else {
            // setTimeout(() => {
            //     document.getElementById('predictionSection').style.display = 'block';
            //     loadModelAndPredict();
            // }, 1000);
        }
    }

    showNextMessage();
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