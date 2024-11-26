let currentTestId = 1;

function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
}

// function updateSteps(stepNumber) {
//     document.querySelectorAll('.step').forEach((step, index) => {
//         step.classList.toggle('active', index < stepNumber);
//         if (index < stepNumber) {
//             step.classList.remove('disabled');
//         } else if (index > stepNumber) {
//             step.classList.add('disabled');
//         }
//     });
// }

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

        // if (data.analysis.toLowerCase().includes('yes')) {
        //     document.getElementById('testsSection').style.display = 'block';
        //     updateSteps(2);
        //     // setupGeneticTestingOptions();
        //     updateDoctorResponse("Based on your symptoms, genetic testing is highly recommended at this time.", 'history');
        //     addTestResult();
        // } else {
        //     updateDoctorResponse("Based on your symptoms, genetic testing is not recommended at this time.", 'history');
        //     addTestResult();
        // }
        // document.getElementById('testsSection').style.display = 'block';
        // updateSteps(2);
        updateDoctorResponse("请去检验科室做进一步检查", 'history');
        // addTestResult();

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

// function setupGeneticTestingOptions() {
//     const testResults = document.getElementById('testResults');
//     testResults.innerHTML = `
//         <h3>Recommended Genetic Tests:</h3>
//         <div class="genetic-test-options">
//             <div class="test-option">
//                 <input type="checkbox" id="test1" name="genetic-test">
//                 <label for="test1">Comprehensive Gene Panel</label>
//             </div>
//             <div class="test-option">
//                 <input type="checkbox" id="test2" name="genetic-test">
//                 <label for="test2">Specific Gene Testing</label>
//             </div>
//         </div>
//     `;
// }

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
                            <li>定期监测电解质水平</li>
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


async function getFinalDiagnosis_fix() {
    try {
        const discussions = [
            // 第一轮：初步诊断
            {
                doctor1: `从遗传学角度来看，患者的症状高度符合Gitelman综合征的特征。这是一种常染色体隐性遗传病，主要影响SLC12A3基因。建议进行基因检测确认诊断。`,
                doctor2: `但我们需要先排除其他可能导致低钾血症的情况。比如，患者是否有长期服用利尿剂或者有严重的腹泻病史？`,
                doctor3: `从实验室检查来看，患者不仅有低钾血症，还伴有低镁血症和代谢性碱中毒，尿钾排泄增加。这些指标都支持Gitelman综合征的诊断。`
            },
            // 第二轮：深入讨论
            {
                doctor1: `我同意检验科的意见。患者的实验室指标和临床表现都很典型。特别是低尿钙的表现，这是区别于Bartter综合征的重要指标。`,
                doctor2: `从肾病科的角度，我们观察到患者的血压偏低，这与肾小管钠离子重吸收障碍相符。但我建议还需要进行醛固酮和肾素活性的检测。`,
                doctor3: `补充一点，患者的血气分析显示代谢性碱中毒，这与远曲小管功能障碍导致的氯离子重吸收缺陷是一致的。`
            },
            // 第三轮：治疗方案讨论
            {
                doctor1: `考虑到这是一个遗传性疾病，我建议对患者的家族成员也进行筛查。`,
                doctor2: `治疗方案上，我建议口服补充氯化钾和硫酸镁，同时适当补充氯化钠。需要定期监测电解质水平。`,
                doctor3: `我建议设定具体的监测指标：血钾维持在3.5-4.0mmol/L，血镁维持在0.7-1.0mmol/L。建议每月监测一次，待稳定后可延长至3个月。`
            }
        ];

        // 逐轮显示讨论内容
        for (let round = 0; round < discussions.length; round++) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // 各轮之间的间隔

            // 更新三位医生的发言
            document.querySelector('#finalDiagnosis1 .diagnosis-content').innerHTML = 
                `<p class="round-indicator">讨论轮次 ${round + 1}/3</p>` + discussions[round].doctor1;
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            document.querySelector('#finalDiagnosis2 .diagnosis-content').innerHTML = 
                `<p class="round-indicator">讨论轮次 ${round + 1}/3</p>` + discussions[round].doctor2;
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            document.querySelector('#finalDiagnosis3 .diagnosis-content').innerHTML = 
                `<p class="round-indicator">讨论轮次 ${round + 1}/3</p>` + discussions[round].doctor3;
        }

        // 最后显示AI主持医生的总结
        await new Promise(resolve => setTimeout(resolve, 3000));
        const aiHostSummary = document.querySelector('#aiHostSummary .diagnosis-content');
        aiHostSummary.innerHTML = `
            <p>感谢各位专家的深入讨论。经过三轮会诊，我们达成以下共识：</p>
            <ol>
                <li>诊断：临床表现和实验室检查高度支持Gitelman综合征的诊断</li>
                <li>基因诊断：建议进行SLC12A3基因检测以进一步确认诊断</li>
                <li>需要个性化治疗方案：
                    <ul>
                        <li>补充电解质</li>
                        <li>联合保钾利尿剂、COX抑制剂、ACEI/ARB规律随访与监测</li>
                        <li>管理慢性并发症</li>
                    </ul>
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

// 模拟加载预训练模型和预测过程
async function loadModelAndPredict() {
    try {
        showLoading();
        
        // 模拟模型加载延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 获取输入特征
        const features = {
            blood_k: 2.8,
            urine_k: 200,
            blood_mg: 0.5,
            blood_pressure_systolic: 95,
            blood_pressure_diastolic: 60
        };
        
        // 模拟模型预测
        const prediction = predictGitelman(features);
        
        // 更新预测结果显示
        updatePredictionDisplay(prediction);
        
        hideLoading();
    } catch (error) {
        console.error('预测过程出错:', error);
        hideLoading();
    }
}

// 模拟预测函数
function predictGitelman(features) {
    // 这里应该是实际的模型预测逻辑
    // 现在返回一个模拟的预测概率
    return 0.92;
}

// 更新预测结果显示
function updatePredictionDisplay(probability) {
    const probabilityFill = document.querySelector('.probability-fill');
    const probabilityValue = document.querySelector('.probability-value');
    
    probabilityFill.style.width = `${probability * 100}%`;
    probabilityValue.textContent = `${(probability * 100).toFixed(0)}%`;

    // updateSteps(3);
}

// 页面加载时自动运行预测
document.addEventListener('DOMContentLoaded', loadModelAndPredict);

function showChatSection() {
    // 显示聊天部分
    const chatSection = document.getElementById('chatSection');
    chatSection.style.display = 'block';
    
    // 开始逐条显示消息
    const messages = document.querySelectorAll('.chat-message');
    let currentIndex = 0;

    function showNextMessage() {
        if (currentIndex < messages.length) {
            const message = messages[currentIndex];
            message.classList.remove('hidden');
            
            // 使用setTimeout来确保transition效果生效
            setTimeout(() => {
                message.classList.add('show');
            }, 50);

            currentIndex++;
            
            // 设置下一条消息的显示时间（根据消息长度调整
            const messageLength = message.querySelector('.message-content').textContent.length;
            const delay = Math.max(1000, messageLength * 30); // 最少1.5秒，或更长
            
            setTimeout(showNextMessage, delay);
        } else {
            // 所有消息显示完后，显示AI预测部分
            setTimeout(() => {
                document.getElementById('predictionSection').style.display = 'block';
                loadModelAndPredict();
            }, 1000);
        }
    }

    showNextMessage();
}

function showAIPrompt() {
    // 隐藏其他部分
    // 显示提示词部分
    const promptSection = document.getElementById('promptSection');
    promptSection.style.display = 'block';
    
    // 可以添加动画效果
    const nodes = promptSection.querySelectorAll('.tree-node');
    nodes.forEach((node, index) => {
        setTimeout(() => {
            node.style.opacity = '1';
        }, index * 300);
    });
}