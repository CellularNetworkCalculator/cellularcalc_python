import { erf } from 'mathjs';

// Константи
let F_min = 880;
let F_max = 915;
let F_k = 0.1;
let n_a = 8;
let Na = 250000;
let N_activ = 0.025;
let P_block = 0.1;
let P_safty = 9;
let P_t = 10;
let S = 10;
let Gain_ms = -120;
let G_bs = 6;
let H_bs = 30;
let alfa = 10;

let  n_k = (F_max - F_min) / F_k;
// Функція для нормальної щільності ймовірності
function normalPDF(x) {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

// Функція для чисельного інтегрування
function integrate(func, start, end, step = 0.001) {
    let area = 0;
    for (let x = start; x < Math.min(end, 10); x += step) { // Оновили кінцеву межу
        area += func(x) * step;
    }
    return area;
}

// Функція для обчислення ймовірності
function survivalFunction(x1) {
    let step = 0.008; // Крок для чисельного інтегрування
    let infinity = 10; // Наближене значення "нескінченності"
    return integrate(normalPDF, x1, infinity, step);
}

function klusterSize(antenaSectorCount: number, propouseSize: number): number {
    let K = propouseSize;
    let M = antenaSectorCount;
    let q = Math.sqrt(3 * K);
    let gama = 0.1 * Math.log(10);

    let beta_sum = 0;
    if (M === 1) {
      beta1 = beta2 = beta3 = beta4 = beta5 = beta6 = 0;
        beta1 = (q - 1) ** (-4);
        beta2 = beta1;
        beta3 = q ** (-4);
        beta4 = beta3;
        beta5 = (q + 1) ** (-4);
        beta6 = beta5;
        beta_sum = beta1 + beta2 + beta3 + beta4 + beta5 + beta6;
        a_e_2 = (1 / (gama ** 2)) * Math.log(1 + (Math.exp((gama ** 2) * (alfa ** 2)) - 1) * (((beta1 ** 2) + (beta2 ** 2) + (beta3 ** 2) + (beta4 ** 2) + (beta5 ** 2) + (beta6 ** 2)) / (beta_sum ** 2)));
    } else if (M === 3) {
        beta1 = beta2 = beta3 = beta4 = beta5 = beta6 = 0;
        beta1 = (q + 1) ** (-4);
        beta2 = q ** (-4);
        beta_sum = beta1 + beta2;
        a_e_2 = (1 / (gama ** 2)) * Math.log(1 + (Math.exp((gama ** 2) * (alfa ** 2)) - 1) * (((beta1 ** 2) + (beta2 ** 2)) / (beta_sum ** 2)));
    } else if (M === 6) {
        beta1 = beta2 = beta3 = beta4 = beta5 = beta6 = 0;
        beta_sum = (q + 1) ** (-4);
        a_e_2 = (1 / (gama ** 2)) * Math.log(1 + (Math.exp((gama ** 2) * (alfa ** 2)) - 1));
    }
    beta_e = beta_sum * Math.exp((gama ** 2 / 2) * (alfa ** 2 - a_e_2));
    a_p_2 = alfa**2 + a_e_2;
    a_p = Math.sqrt(a_p_2);
    x1 = (10 * Math.log10(1 / beta_e) - P_safty) / a_p;

    P_t_now = survivalFunction(x1);
    Pn = P_t_now * 100;
    return Pn;
}

let Pn_list: { Pn: number; M: number; N: number }[] = [];
[1, 3, 6].forEach((M) => {
    [1, 3, 6].forEach((N) => {
        let Pn = klusterSize(M, N);
        Pn_list.push({ Pn, M, N });
    });
});
closest = Pn_list.reduce((prev, curr) => (Math.abs(curr.Pn - P_t) < Math.abs(prev.Pn - P_t) ? curr : prev));
let { M, N } = closest;

let n_s = Math.floor(n_k / (M * N));
while (n_s === 0) {
    F_k = parseFloat(prompt("Замала кількість каналів, спробуйте зменшити ширину одного каналу(МГц): ") || "0");
    n_k = (F_max - F_min) / F_k;
    n_s = Math.floor(n_k / (M * N));
}

// припустиме телефонне навантаження
let n0 = n_a * n_s;
let A: number;

while (true) {
    try {
        if (P_block <= 2 / (Math.PI * n0)) {
            A = n0 * (1 - Math.sqrt(1 - Math.pow(P_block * Math.sqrt((Math.PI * n0) / 2), 1 / n0)));
        } else {
            A = n0 + Math.sqrt(Math.PI / 2 + 2 * n0 * Math.log(P_block * Math.sqrt((Math.PI * n0) / 2))) - Math.sqrt(Math.PI / 2);
        }
        break;
    } catch (error) {
        console.log("Під коренем опинилося відємне число. Спробуйте замінити значення імовірності блокування виклику");
        P_block = parseFloat(prompt("Нове значення імовірності блокування виклику: ") || "0");
    }
}

// число абонетів на одну БС
let N_bs = Math.floor(A / N_activ);

// число БС у мережі
let K = Math.ceil(Na / N_bs);

// радіус одної БС
let R0 = parseFloat(Math.sqrt(S / (Math.PI * K)).toFixed(2));

// потужність передавача БС
let rounded_F_min = Math.ceil(F_min / 100) * 100;
let rounded_F_max = Math.floor(F_max / 100) * 100;
let F_round = Math.abs(F_min - rounded_F_min) < Math.abs(F_max - rounded_F_max) ? rounded_F_min : rounded_F_max;

let P_bs = parseFloat(`${-(G_bs - 70 - 26.16 * Math.log10(F_round) + 13.82 * Math.log10(H_bs) - (45 - 6.55 * Math.log10(H_bs)) * Math.log10(R0)) + Gain_ms}`).toFixed(2);

console.log("Результати розрахунків:");
console.log(`Оптимальна розмірність кластера: ${N}`);
console.log(`Число секторів в одному стільнику: ${M}`);
console.log(`Кількість БС: ${K}`);
console.log(`Радіус БС: ${R0.toFixed(2)} км`);
console.log(`Потужність передавача БС: ${P_bs} дБм`);
