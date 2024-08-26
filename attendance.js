const video = document.getElementById("video");
const faceImage = document.getElementById("faceImage");
const cameraSelect = document.getElementById("cameraSelect");
const ipCameraUrlInput = document.getElementById("ipCameraUrl");
const startIpCameraButton = document.getElementById("startIpCamera");
let popupVisible = false;
let lastCancelTimes = {}; // Track the last cancel times per employee

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        cameraSelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = 'Select a camera';
        defaultOption.selected = true;
        cameraSelect.appendChild(defaultOption);

        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error getting cameras:", error);
    }
}

function webCam(deviceId) {
    navigator.mediaDevices.getUserMedia({
        video: { deviceId: deviceId ? { exact: deviceId } : undefined },
        audio: false,
    }).then(
        (stream) => {
            video.srcObject = stream;
        }
    ).catch(
        (error) => {
            console.error("Error accessing webcam:", error);
        }
    );
}

function startIpCamera() {
    const ipCameraUrl = ipCameraUrlInput.value.trim();
    if (!ipCameraUrl) {
        console.error("IP Camera URL is required");
        return;
    }
    
    video.src = ipCameraUrl;
    video.play().catch(error => {
        console.error("Error playing IP camera stream:", error);
    });
}

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    faceapi.nets.faceExpressionNet.loadFromUri("/models"),
    faceapi.nets.ageGenderNet.loadFromUri("/models"),
    faceapi.nets.ssdMobilenetv1.loadFromUri("/models") 
]).then(() => {
    getCameras();
    cameraSelect.addEventListener('change', () => webCam(cameraSelect.value));
    startIpCameraButton.addEventListener('click', startIpCamera);
});

video.addEventListener("play", async () => {
    const labeledFaceDescriptors = await loadLabeledImages();
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    faceapi.matchDimensions(canvas, { height: video.height, width: video.width });

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions()
        .withAgeAndGender();
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        const resizedDetections = faceapi.resizeResults(detections, {
            height: video.height,
            width: video.width,
        });

        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));

        results.forEach(async (result, i) => {
            const box = resizedDetections[i].detection.box;
            const { age, gender, expressions } = resizedDetections[i];
            const maxExpression = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);

            const label = `${result.label} (${Math.round(age)} years old, ${gender}, ${maxExpression})`;

            const drawBox = new faceapi.draw.DrawBox(box, { label });
            drawBox.draw(canvas);

            if (result.label !== 'unknown') {
                setTimeout(async () => {
                    const faceCanvas = document.createElement('canvas');
                    faceCanvas.width = box.width;
                    faceCanvas.height = box.height;
                    const faceContext = faceCanvas.getContext('2d');
                    faceContext.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);

                    faceImage.src = faceCanvas.toDataURL();
                    faceImage.style.display = 'block';

                    const imageName = `${result.label}.jpg`;
                    const captureTime = new Date().toISOString();

                    if (!lastCancelTimes[imageName] || (new Date() - new Date(lastCancelTimes[imageName])) >= 300000) {
                        const status = await showPopup(imageName, captureTime);
                        if (status) {
                            await saveFaceData(imageName, captureTime, status);
                        }
                    }
                }, 2000);
            }
        });
    }, 100);
});

async function loadLabeledImages() {
    const labels = ['Manoj', 'Vijay','Pravin','Rushikesh','Aniket','Abhishek','Shubham','Akshay','Mahesh','Akshay_s','Rajdeep','Sanket'];
    const imageCount = 3;
    
    return Promise.all(
        labels.map(async label => {
            const descriptions = [];
            
            for (let i = 1; i <= imageCount; i++) {
                try {
                    const img = await faceapi.fetchImage(`/employees/${label}/image${i}.jpg`);
                    const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                    if (detections) {
                        descriptions.push(detections.descriptor);
                    }
                } catch (error) {
                    console.error(`Error loading image for label ${label}:`, error);
                }
            }
            
            return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
    );
}

function showPopup(imageName, captureTime) {
    return new Promise((resolve) => {
        if (popupVisible) return; // Prevent multiple popups

        const lastCancelTime = lastCancelTimes[imageName];
        const currentTime = new Date();

        if (lastCancelTime && (currentTime - lastCancelTime) < 300000) { // 5 minutes = 300000ms
            console.log('Popup canceled recently, not showing again.');
            resolve(null);
            return;
        }

        popupVisible = true;

        const popup = document.createElement('div');
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.padding = '20px';
        popup.style.backgroundColor = 'white';
        popup.style.border = '2px solid black';
        popup.style.zIndex = '1000';

        const statusText = document.createElement('p');
        statusText.textContent = 'Please select your status:';
        popup.appendChild(statusText);

        const inButton = document.createElement('button');
        inButton.textContent = 'IN';
        inButton.onclick = () => {
            document.body.removeChild(popup);
            popupVisible = false;
            lastCancelTimes[imageName] = new Date();
            resolve('IN');
        };
        popup.appendChild(inButton);

        const outButton = document.createElement('button');
        outButton.textContent = 'OUT';
        outButton.onclick = () => {
            document.body.removeChild(popup);
            popupVisible = false;
            lastCancelTimes[imageName] = new Date();
            resolve('OUT');
        };
        popup.appendChild(outButton);

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.onclick = () => {
            document.body.removeChild(popup);
            popupVisible = false;
            lastCancelTimes[imageName] = new Date();
            resolve(null);
        };
        popup.appendChild(cancelButton);

        document.body.appendChild(popup);
    });
}

async function saveFaceData(imageName, captureTime, status) {
    try {
        const response = await fetch('http://localhost:3000/api/save-face', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageName, captureTime, status })
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        console.log('Face data saved:', await response.text());
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}
