/**
 * Indian Income Tax Engine (New Regime FY 2024–25 / FY 2025–26)
 * Calculates realistic post-tax monthly bank in-hand salary from gross Annual CTC (LPA).
 */
export const calculateTakeHomeSalary = (annualCtcLpa) => {
  const ctc = (Number(annualCtcLpa) || 0) * 100000;
  if (ctc <= 0) {
    return {
      grossMonthly: 0,
      netMonthly: 0,
      annualTax: 0,
      annualEpf: 0,
      annualInHand: 0,
    };
  }

  // Basic pay ~45% of CTC
  const basicAnnual = ctc * 0.45;
  // EPF: 12% of Basic (capped at standard limits)
  const employeeEpfAnnual = Math.min(basicAnnual * 0.12, 1800 * 12);
  const employerEpfAnnual = employeeEpfAnnual;
  const gratuityAnnual = basicAnnual * 0.0481;

  // Gross Salary = CTC minus employer EPF and gratuity
  const grossSalaryAnnual = ctc - employerEpfAnnual - gratuityAnnual;
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, grossSalaryAnnual - standardDeduction);

  // New Tax Regime Slabs (Budget 2024)
  let tax = 0;
  if (taxableIncome > 1500000) {
    tax += (taxableIncome - 1500000) * 0.30;
    tax += 300000 * 0.20; // 12L-15L
    tax += 200000 * 0.15; // 10L-12L
    tax += 300000 * 0.10; // 7L-10L
    tax += 400000 * 0.05; // 3L-7L
  } else if (taxableIncome > 1200000) {
    tax += (taxableIncome - 1200000) * 0.20;
    tax += 200000 * 0.15;
    tax += 300000 * 0.10;
    tax += 400000 * 0.05;
  } else if (taxableIncome > 1000000) {
    tax += (taxableIncome - 1000000) * 0.15;
    tax += 300000 * 0.10;
    tax += 400000 * 0.05;
  } else if (taxableIncome > 700000) {
    tax += (taxableIncome - 700000) * 0.10;
    tax += 400000 * 0.05;
  } else if (taxableIncome > 300000) {
    tax += (taxableIncome - 300000) * 0.05;
  }

  // Section 87A rebate: zero tax if taxable income <= 7 LPA
  if (taxableIncome <= 700000) {
    tax = 0;
  }

  const totalTaxAnnual = tax > 0 ? tax * 1.04 : 0;
  const professionalTaxAnnual = 2400; // Standard ₹200/month

  const netInHandAnnual = Math.max(0, grossSalaryAnnual - employeeEpfAnnual - totalTaxAnnual - professionalTaxAnnual);
  const netMonthly = Math.round(netInHandAnnual / 12);
  const grossMonthly = Math.round(ctc / 12);

  return {
    grossMonthly,
    netMonthly,
    annualTax: Math.round(totalTaxAnnual),
    annualEpf: Math.round(employeeEpfAnnual),
    annualInHand: Math.round(netInHandAnnual),
  };
};

/**
 * Standard Banking EMI Formula and Prepayment Amortization Simulator
 */
export const calculateLoanDetails = (
  principal,
  annualInterestRate,
  tenureYears,
  extraMonthly = 0,
  annualLumpSum = 0
) => {
  const P = Math.max(0, Number(principal) || 0);
  const rate = Number(annualInterestRate) || 8.5;
  const tenure = Number(tenureYears) || 7;

  if (P <= 0) {
    return {
      monthlyEmi: 0,
      totalInterest: 0,
      totalPayment: 0,
      actualTenureMonths: 0,
      interestSaved: 0,
      monthsSaved: 0,
    };
  }

  const r = rate / (12 * 100);
  const n = tenure * 12;

  // Monthly EMI: P * r * (1+r)^n / ((1+r)^n - 1)
  const monthlyEmi = Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  const baselineTotalPayment = monthlyEmi * n;
  const baselineTotalInterest = baselineTotalPayment - P;

  // Prepayment amortization
  let balance = P;
  let simulatedMonths = 0;
  let simulatedInterest = 0;
  const maxMonths = 360;

  const extraM = Number(extraMonthly) || 0;
  const extraAnnual = Number(annualLumpSum) || 0;

  while (balance > 0 && simulatedMonths < maxMonths) {
    simulatedMonths++;
    const monthlyInt = balance * r;
    simulatedInterest += monthlyInt;

    let payment = monthlyEmi + extraM;
    if (simulatedMonths % 12 === 0 && extraAnnual > 0) {
      payment += extraAnnual;
    }

    const principalPaid = payment - monthlyInt;
    if (balance <= principalPaid) {
      balance = 0;
      break;
    } else {
      balance -= principalPaid;
    }
  }

  const interestSaved = Math.max(0, Math.round(baselineTotalInterest - simulatedInterest));
  const monthsSaved = Math.max(0, n - simulatedMonths);

  return {
    monthlyEmi,
    totalInterest: Math.round(baselineTotalInterest),
    totalPayment: Math.round(baselineTotalPayment),
    actualTenureMonths: simulatedMonths,
    simulatedTotalInterest: Math.round(simulatedInterest),
    interestSaved,
    monthsSaved,
  };
};

/**
 * Complete Simulation Aggregator
 */
export const runFullRoiSimulation = ({
  totalFee = 1800000,
  downPayment = 200000,
  annualCtc = 8.5,
  interestRate = 8.5,
  tenureYears = 7,
  livingExpenses = 18000,
  extraMonthly = 0,
  annualBonus = 0,
}) => {
  const principal = Math.max(0, totalFee - downPayment);
  const salary = calculateTakeHomeSalary(annualCtc);
  const loan = calculateLoanDetails(principal, interestRate, tenureYears, extraMonthly, annualBonus);

  const netTakeHome = salary.netMonthly;
  const emi = loan.monthlyEmi;
  const living = Number(livingExpenses) || 0;
  const disposableSavings = netTakeHome - emi - living;

  const dti = netTakeHome > 0 ? Number(((emi / netTakeHome) * 100).toFixed(1)) : 100;

  let riskLevel = 'low';
  let riskVerdict = 'Healthy Financial ROI 🟢';
  let riskColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let riskDescription =
    'Your monthly EMI is well below 28% of your take-home pay. You have ample disposable income to save, invest, and build emergency reserves.';

  if (dti > 55) {
    riskLevel = 'critical';
    riskVerdict = 'High Risk / Potential Debt Trap 🔴';
    riskColor = 'text-rose-700 bg-rose-50 border-rose-200';
    riskDescription =
      'Over 55% of your in-hand salary goes directly to bank EMI! In metro cities, rent and food will cause a monthly cash deficit. Strongly consider scholarships or colleges with a better median-to-fee ratio.';
  } else if (dti > 40) {
    riskLevel = 'high';
    riskVerdict = 'Heavy Debt Strain 🟠';
    riskColor = 'text-amber-800 bg-amber-50 border-amber-200';
    riskDescription =
      'Between 40% and 55% of your pay is locked into EMI. Metro living will consume nearly all remaining funds, leaving virtually no buffer for emergencies or job transitions.';
  } else if (dti > 28) {
    riskLevel = 'moderate';
    riskVerdict = 'Manageable Debt Burden 🟡';
    riskColor = 'text-blue-800 bg-blue-50 border-blue-200';
    riskDescription =
      'Your EMI consumes 28%–40% of take-home pay. It is manageable with sensible budgeting, though discretionary luxury expenses should be kept in check.';
  }

  // Payback duration
  const annualSavings = Math.max(1, salary.annualInHand - living * 12);
  const paybackYears = Number((totalFee / annualSavings).toFixed(1));

  // ROI score 0 to 100
  const salaryToFeeRatio = (annualCtc * 100000 * 3) / totalFee;
  let roiScore = Math.round(salaryToFeeRatio * 25 + (100 - dti) * 0.4 + Math.max(0, 10 - paybackYears) * 3);
  roiScore = Math.max(15, Math.min(99, roiScore));

  return {
    principal,
    totalFee,
    downPayment,
    salary,
    loan,
    living,
    disposableSavings,
    dti,
    risk: {
      level: riskLevel,
      verdict: riskVerdict,
      color: riskColor,
      description: riskDescription,
    },
    paybackYears,
    roiScore,
    prepayment: {
      interestSaved: loan.interestSaved,
      monthsSaved: loan.monthsSaved,
      yearsSaved: Number((loan.monthsSaved / 12).toFixed(1)),
      newTenureYears: Number((loan.actualTenureMonths / 12).toFixed(1)),
    },
  };
};
