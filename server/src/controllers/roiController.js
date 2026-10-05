const College = require('../models/College');
const PlacementRecord = require('../models/PlacementRecord');
const { sendSuccess, sendError } = require('../utils/responseHelper');

// Helper: Indian Income Tax Engine (New Regime FY 2024–25 / FY 2025–26)
const calculateIndianTakeHomeSalary = (annualCtcLpa) => {
  const ctc = annualCtcLpa * 100000;
  if (ctc <= 0) return { grossMonthly: 0, netMonthly: 0, annualTax: 0, annualEpf: 0 };

  // Assume Basic Pay is ~45% of CTC
  const basicAnnual = ctc * 0.45;

  // EPF: 12% of Basic (capped at 15000/mo base or calculated)
  const employeeEpfAnnual = Math.min(basicAnnual * 0.12, 1800 * 12);
  const employerEpfAnnual = employeeEpfAnnual; // Part of CTC
  const gratuityAnnual = basicAnnual * 0.0481; // Part of CTC

  // Taxable Income under New Regime:
  // Gross Salary = CTC - Employer EPF - Gratuity
  const grossSalaryAnnual = ctc - employerEpfAnnual - gratuityAnnual;
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, grossSalaryAnnual - standardDeduction);

  // New Tax Regime Slabs
  let tax = 0;
  if (taxableIncome > 1500000) {
    tax += (taxableIncome - 1500000) * 0.30;
    tax += 300000 * 0.20; // 12L to 15L
    tax += 200000 * 0.15; // 10L to 12L
    tax += 300000 * 0.10; // 7L to 10L
    tax += 400000 * 0.05; // 3L to 7L
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

  // Section 87A Rebate: if taxable income <= 7,00,000, tax is 0!
  if (taxableIncome <= 700000) {
    tax = 0;
  }

  // 4% Health and Education Cess
  const totalTaxAnnual = tax > 0 ? tax * 1.04 : 0;
  const professionalTaxAnnual = 2400; // Standard ₹200/mo across major states

  // Total annual take-home
  const netInHandAnnual = Math.max(0, grossSalaryAnnual - employeeEpfAnnual - totalTaxAnnual - professionalTaxAnnual);
  const netInHandMonthly = Math.round(netInHandAnnual / 12);
  const grossMonthly = Math.round(ctc / 12);

  return {
    grossMonthly,
    netMonthly: netInHandMonthly,
    annualTax: Math.round(totalTaxAnnual),
    annualEpf: Math.round(employeeEpfAnnual),
    annualInHand: Math.round(netInHandAnnual),
  };
};

// Helper: Loan EMI Calculator with Prepayment simulation
const calculateLoanMetrics = (principal, annualInterestRate, tenureYears, extraMonthly = 0, annualLumpSum = 0) => {
  if (principal <= 0) {
    return {
      monthlyEmi: 0,
      totalInterest: 0,
      totalPayment: 0,
      actualTenureMonths: 0,
      interestSaved: 0,
      monthsSaved: 0,
    };
  }

  const monthlyRate = annualInterestRate / (12 * 100);
  const totalMonths = tenureYears * 12;

  // Standard EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
  const standardEmi = Math.round(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1)
  );

  const baselineTotalPayment = standardEmi * totalMonths;
  const baselineTotalInterest = baselineTotalPayment - principal;

  // Prepayment amortization simulation
  let balance = principal;
  let simulatedMonths = 0;
  let simulatedInterest = 0;
  const maxMonths = 360;

  while (balance > 0 && simulatedMonths < maxMonths) {
    simulatedMonths++;
    const interestForMonth = balance * monthlyRate;
    simulatedInterest += interestForMonth;

    let totalPaymentThisMonth = standardEmi + extraMonthly;
    // Add annual lump sum at month 12, 24, 36...
    if (simulatedMonths % 12 === 0 && annualLumpSum > 0) {
      totalPaymentThisMonth += annualLumpSum;
    }

    const principalPaidThisMonth = totalPaymentThisMonth - interestForMonth;

    if (balance <= principalPaidThisMonth) {
      balance = 0;
      break;
    } else {
      balance -= principalPaidThisMonth;
    }
  }

  const simulatedTotalPayment = principal + simulatedInterest;
  const interestSaved = Math.max(0, Math.round(baselineTotalInterest - simulatedInterest));
  const monthsSaved = Math.max(0, totalMonths - simulatedMonths);

  return {
    monthlyEmi: standardEmi,
    totalInterest: Math.round(baselineTotalInterest),
    totalPayment: Math.round(baselineTotalPayment),
    actualTenureMonths: simulatedMonths,
    simulatedTotalInterest: Math.round(simulatedInterest),
    interestSaved,
    monthsSaved,
  };
};

// @desc Get colleges directory with fee structures and verified median placement packages
// @route GET /api/roi/colleges
const getRoiColleges = async (req, res, next) => {
  try {
    const colleges = await College.find({})
      .select('name shortName city state tierClassification feeStructure nirfRanking top50Rank isTop50Private')
      .lean();

    const collegeIds = colleges.map((c) => c._id);

    // Fetch latest placement records to attach median package
    const placementRecords = await PlacementRecord.find({
      collegeId: { $in: collegeIds },
    })
      .sort({ academicSession: -1, createdAt: -1 })
      .lean();

    const recordMap = {};
    for (const rec of placementRecords) {
      const cid = rec.collegeId.toString();
      if (!recordMap[cid]) {
        recordMap[cid] = rec;
      }
    }

    const enriched = colleges.map((col) => {
      const p = recordMap[col._id.toString()];
      const totalFee = col.feeStructure?.totalEstimatedCourseFeeInr || 1600000;
      const medianCtc = p?.medianPackageLPA || p?.averagePackageLPA || 7.5;

      return {
        _id: col._id,
        name: col.name,
        shortName: col.shortName || col.name.slice(0, 10),
        city: col.city,
        state: col.state,
        tier: col.tierClassification?.tier || 'Tier 2',
        isTop50Private: col.isTop50Private,
        top50Rank: col.top50Rank,
        totalCourseFeeInr: totalFee,
        feeCategories: col.feeStructure?.feeCategoryOptions || [],
        latestStats: {
          medianPackageLPA: p?.medianPackageLPA || null,
          averagePackageLPA: p?.averagePackageLPA || null,
          highestPackageLPA: p?.highestPackageLPA || null,
          academicSession: p?.academicSession || '2023-24',
        },
        benchmarkMedianLPA: medianCtc,
      };
    });

    return sendSuccess(res, { colleges: enriched }, 'ROI Colleges fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc Calculate full ROI & Loan Simulation
// @route POST /api/roi/simulate
const calculateRoiSimulation = async (req, res, next) => {
  try {
    const totalCourseFeeInr = Number(req.body.totalCourseFeeInr ?? req.body.totalFee ?? 1800000);
    const downPaymentInr = Number(req.body.downPaymentInr ?? req.body.downPayment ?? 200000);
    const annualCtcLpa = Number(req.body.annualCtcLpa ?? req.body.annualCtc ?? 8.5);
    const loanInterestRate = Number(req.body.loanInterestRate ?? req.body.interestRate ?? 8.5);
    const loanTenureYears = Number(req.body.loanTenureYears ?? req.body.tenureYears ?? 7);
    const metroLivingExpenseMonthlyInr = Number(req.body.metroLivingExpenseMonthlyInr ?? req.body.livingExpenses ?? 18000);
    const extraMonthlyPrepaymentInr = Number(req.body.extraMonthlyPrepaymentInr ?? req.body.extraMonthly ?? 0);
    const annualBonusPrepaymentInr = Number(req.body.annualBonusPrepaymentInr ?? req.body.annualBonus ?? 0);

    const principalLoanAmount = Math.max(0, totalCourseFeeInr - downPaymentInr);

    // 1. Calculate In-Hand Salary
    const salary = calculateIndianTakeHomeSalary(annualCtcLpa);

    // 2. Calculate Loan Metrics
    const loan = calculateLoanMetrics(
      principalLoanAmount,
      loanInterestRate,
      loanTenureYears,
      extraMonthlyPrepaymentInr,
      annualBonusPrepaymentInr
    );

    // 3. Living Expenses & Disposable Income
    const netTakeHome = salary.netMonthly;
    const emi = loan.monthlyEmi;
    const living = metroLivingExpenseMonthlyInr;
    const disposableSavingsMonthly = netTakeHome - emi - living;

    // 4. Debt-to-Income (DTI) Ratio
    const dtiPercentage = netTakeHome > 0 ? Number(((emi / netTakeHome) * 100).toFixed(1)) : 100;

    // 5. Risk Assessment Rating
    let riskVerdict = 'Healthy ROI';
    let riskLevel = 'low'; // 'low' | 'moderate' | 'high' | 'critical'
    let riskDescription = '';

    if (dtiPercentage <= 28) {
      riskLevel = 'low';
      riskVerdict = 'Excellent Financial ROI 🟢';
      riskDescription = 'Your monthly EMI is well below 28% of your take-home pay. You have ample disposable income to invest, save, and handle emergency expenses.';
    } else if (dtiPercentage <= 40) {
      riskLevel = 'moderate';
      riskVerdict = 'Balanced / Moderate Burden 🟡';
      riskDescription = 'Your EMI consumes between 28% and 40% of your take-home pay. It is manageable with standard budgeting, though lifestyle luxury spending should be moderated.';
    } else if (dtiPercentage <= 55) {
      riskLevel = 'high';
      riskVerdict = 'High Debt Strain 🟠';
      riskDescription = 'Over 40% of your salary goes directly to loan repayment. Rent and living expenses in metro cities will consume nearly all remaining funds, leaving very narrow emergency savings.';
    } else {
      riskLevel = 'critical';
      riskVerdict = 'Critical Debt Risk / Potential Trap 🔴';
      riskDescription = 'Your loan EMI eats over 55% of your take-home pay! After basic rent and food, you will be operating at a monthly deficit. We strongly recommend reducing loan size through scholarships or opting for a college with a higher median salary-to-fee ratio.';
    }

    // 6. Payback Duration
    // Total investment / Annual disposable savings
    const annualNetSavings = Math.max(1, salary.annualInHand - living * 12);
    const paybackYearsSimple = Number((totalCourseFeeInr / annualNetSavings).toFixed(1));

    // 7. Overall ROI Score (0 to 100)
    // Factors: Salary-to-fee ratio (40%), DTI (40%), Payback duration (20%)
    const salaryToFeeRatio = (annualCtcLpa * 100000 * 3) / totalCourseFeeInr; // 3 years salary vs 4-yr fee
    let score = Math.min(100, Math.round(salaryToFeeRatio * 25 + (100 - dtiPercentage) * 0.4 + Math.max(0, 10 - paybackYearsSimple) * 3));
    score = Math.max(10, Math.min(99, score));

    return sendSuccess(
      res,
      {
        simulation: {
          principal: principalLoanAmount,
          principalLoanAmount,
          totalInvestment: totalCourseFeeInr,
          totalFee: totalCourseFeeInr,
          downPayment: downPaymentInr,
          annualCtcLpa,
          loanInterestRate,
          loanTenureYears,
          monthlyEmi: emi,
          emi,
          totalLoanRepayment: loan.totalPayment,
          totalInterestPaid: loan.totalInterest,
          loan,
          salary: {
            grossMonthly: salary.grossMonthly,
            netMonthly: salary.netMonthly,
            netMonthlyTakeHome: salary.netMonthly,
            annualTaxDeduction: salary.annualTax,
            annualEpfDeduction: salary.annualEpf,
            annualInHand: salary.annualInHand,
          },
          livingExpensesMonthly: living,
          disposableSavingsMonthly,
          dtiPercentage,
          dti: dtiPercentage,
          risk: {
            level: riskLevel,
            verdict: riskVerdict,
            description: riskDescription,
          },
          paybackYearsSimple,
          paybackYears: paybackYearsSimple,
          prepaymentBenefits: {
            interestSavedInr: loan.interestSaved,
            interestSaved: loan.interestSaved,
            monthsSaved: loan.monthsSaved,
            actualTenureYears: Number((loan.actualTenureMonths / 12).toFixed(1)),
          },
          prepayment: {
            interestSaved: loan.interestSaved,
            monthsSaved: loan.monthsSaved,
            yearsSaved: Number((loan.monthsSaved / 12).toFixed(1)),
            newTenureYears: Number((loan.actualTenureMonths / 12).toFixed(1)),
          },
          roiScore: score,
        },
      },
      'Simulation completed successfully'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoiColleges,
  calculateRoiSimulation,
};
