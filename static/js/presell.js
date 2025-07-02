
const progressCircle = document.getElementById('progress');
const percentText = document.getElementById('percent');
const circumference = 2 * Math.PI * 70; // 2πr com r = 70

let percent = 0;

const interval = setInterval(() => {
    if (percent >= 100) {
    clearInterval(interval);
    const part1 = "aHR0cHM6Ly9yaW";
    const part2 = "ZhdXAuY29tLmJyL3J";
    const part3 = "pZmFzL1R3YmtTYTN";
    const part4 = "aS0k=";
    const finalURL = atob(part1 + part2 + part3 + part4);
    window.location.href = finalURL;
    } else {
    percent++;
    const offset = circumference - (percent / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
    percentText.textContent = percent + '%';
    }
}, 40); // 100x40ms = 4 segundos

// Número de pessoas entre 1000 e 2500
function updateViewers() {
    const viewers = Math.floor(Math.random() * 1501) + 1000;
    document.getElementById('viewers').textContent = viewers;
}

updateViewers();
setInterval(updateViewers, 2500);