import { User } from '../models/user.model.js';
import { Meal } from '../models/meal.model.js';
import { Expense } from '../models/expense.model.js';
import { Deposit } from '../models/deposit.model.js';
import { calculateTotalMeals } from '../utils/finance.util.js';
import PDFDocument from 'pdfkit'; 

export const getDashboardSummary = async (req, res) => {
  try {
    const activeMembers = await User.find({ status: 'active' }).select('name email role');
    const totalActiveMembers = activeMembers.length;

    const expenses = await Expense.find();
    let totalBazaarExpense = 0;
    let totalUtilityExpense = 0;
    let totalHouseRentExpense = 0;
    
    // Maps to track dynamic/personal costs per user
    const userExemptedCostMap = new Map(); // Costs user SHOULD NOT pay
    const userPersonalCostMap = new Map(); // Costs ONLY this user should pay

    expenses.forEach((expense) => {
      const amt = Number(expense.amount) || 0;
      
      // Handle Personal Expenses (e.g., Bike Parking)
      if (expense.category === 'Personal' && expense.assignedTo) {
        const uId = expense.assignedTo.toString();
        userPersonalCostMap.set(uId, (userPersonalCostMap.get(uId) || 0) + amt);
        return; // Do not add to shared pool
      }

      // Handle Shared Exemptions (e.g., Someone not paying WiFi)
      let perPersonShare = 0;
      if (totalActiveMembers > 0) {
          const payingMembersCount = totalActiveMembers - (expense.exemptedUsers?.length || 0);
          perPersonShare = payingMembersCount > 0 ? amt / payingMembersCount : 0;
      }

      if (expense.exemptedUsers && expense.exemptedUsers.length > 0) {
         expense.exemptedUsers.forEach(uId => {
             const idStr = uId.toString();
             // We track what they are exempted from, to subtract it later from the average
             userExemptedCostMap.set(idStr, (userExemptedCostMap.get(idStr) || 0) + perPersonShare);
         });
      }

      // Add to main pools
      if (expense.category === 'Bazaar') {
        totalBazaarExpense += amt;
      } else if (expense.category === 'Utility') {
        totalUtilityExpense += amt;
      } else if (expense.category === 'House Rent') {
        totalHouseRentExpense += amt;
      }
    });

    const totalCost = totalBazaarExpense + totalUtilityExpense + totalHouseRentExpense;

    const meals = await Meal.find();
    const userMealMap = new Map();
    let totalMealsConsumed = 0;

    meals.forEach((meal) => {
      const uId = meal.userId.toString();
      const count = calculateTotalMeals(meal);
      totalMealsConsumed += count;
      userMealMap.set(uId, (userMealMap.get(uId) || 0) + count);
    });

    const currentMealRate =
      totalMealsConsumed > 0
        ? Number((totalBazaarExpense / totalMealsConsumed).toFixed(2))
        : 0;

    // Base shared costs (before individual exemptions)
    const baseSharedUtilityPerMember = totalActiveMembers > 0 ? totalUtilityExpense / totalActiveMembers : 0;
    const baseSharedRentPerMember = totalActiveMembers > 0 ? totalHouseRentExpense / totalActiveMembers : 0;

    const deposits = await Deposit.find({ status: 'approved' });
    let totalDeposit = 0;
    const userDepositMap = new Map();

    deposits.forEach((dep) => {
      const uId = dep.userId.toString();
      const amt = Number(dep.amount) || 0;
      totalDeposit += amt;
      userDepositMap.set(uId, (userDepositMap.get(uId) || 0) + amt);
    });

    const individualBalances = activeMembers.map((member) => {
      const memberId = member._id.toString();
      const individualMeals = userMealMap.get(memberId) || 0;
      const individualDeposit = userDepositMap.get(memberId) || 0;

      const mealCost = individualMeals * currentMealRate;
      
      // Calculate true shared cost for this specific user
      const exemptionDeduction = userExemptedCostMap.get(memberId) || 0;
      const trueSharedCost = (baseSharedUtilityPerMember + baseSharedRentPerMember) - exemptionDeduction;
      
      // Add personal isolated costs (e.g., parking)
      const personalExtraCost = userPersonalCostMap.get(memberId) || 0;

      const totalMemberCost = Number((mealCost + trueSharedCost + personalExtraCost).toFixed(2));
      const balance = Number((individualDeposit - totalMemberCost).toFixed(2));

      return {
        userId: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        totalDeposit: individualDeposit,
        totalMeals: individualMeals,
        mealCost: Number(mealCost.toFixed(2)),
        utilityAndRentShare: Number(trueSharedCost.toFixed(2)),
        personalExtraCost: Number(personalExtraCost.toFixed(2)),
        totalCost: totalMemberCost,
        balance
      };
    });

    const loggedInUserBalance = individualBalances.find(
      (m) => m.userId.toString() === req.user._id.toString()
    ) || {
      userId: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      totalDeposit: userDepositMap.get(req.user._id.toString()) || 0,
      totalMeals: userMealMap.get(req.user._id.toString()) || 0,
      mealCost: 0,
      utilityAndRentShare: 0,
      personalExtraCost: 0,
      totalCost: 0,
      balance: userDepositMap.get(req.user._id.toString()) || 0
    };

    return res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalDeposit: Number(totalDeposit.toFixed(2)),
          totalCost: Number(totalCost.toFixed(2)),
          totalBazaarExpense: Number(totalBazaarExpense.toFixed(2)),
          totalUtilityExpense: Number(totalUtilityExpense.toFixed(2)),
          totalHouseRentExpense: Number(totalHouseRentExpense.toFixed(2)),
          totalMeals: totalMealsConsumed,
          currentMealRate,
          totalActiveMembers
        },
        individualBalances,
        userSummary: loggedInUserBalance
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to compute financial summary.'
    });
  }
};

export const downloadSummaryPDF = async (req, res) => {
  try {
    const activeMembers = await User.find({ status: 'active' }).select('name email');
    const totalActiveMembers = activeMembers.length;

    const expenses = await Expense.find();
    let totalBazaarExpense = 0;
    let totalUtilityExpense = 0;
    let totalHouseRentExpense = 0;
    
    const userExemptedCostMap = new Map(); 
    const userPersonalCostMap = new Map(); 

    expenses.forEach((expense) => {
      const amt = Number(expense.amount) || 0;
      if (expense.category === 'Personal' && expense.assignedTo) {
        const uId = expense.assignedTo.toString();
        userPersonalCostMap.set(uId, (userPersonalCostMap.get(uId) || 0) + amt);
        return; 
      }

      let perPersonShare = 0;
      if (totalActiveMembers > 0) {
          const payingMembersCount = totalActiveMembers - (expense.exemptedUsers?.length || 0);
          perPersonShare = payingMembersCount > 0 ? amt / payingMembersCount : 0;
      }

      if (expense.exemptedUsers && expense.exemptedUsers.length > 0) {
         expense.exemptedUsers.forEach(uId => {
             const idStr = uId.toString();
             userExemptedCostMap.set(idStr, (userExemptedCostMap.get(idStr) || 0) + perPersonShare);
         });
      }

      if (expense.category === 'Bazaar') {
        totalBazaarExpense += amt;
      } else if (expense.category === 'Utility') {
        totalUtilityExpense += amt;
      } else if (expense.category === 'House Rent') {
        totalHouseRentExpense += amt;
      }
    });

    const meals = await Meal.find();
    const userMealMap = new Map();
    let totalMealsConsumed = 0;

    meals.forEach((meal) => {
      const uId = meal.userId.toString();
      const count = calculateTotalMeals(meal);
      totalMealsConsumed += count;
      userMealMap.set(uId, (userMealMap.get(uId) || 0) + count);
    });

    const currentMealRate = totalMealsConsumed > 0 ? Number((totalBazaarExpense / totalMealsConsumed).toFixed(2)) : 0;
    const baseSharedUtilityPerMember = totalActiveMembers > 0 ? totalUtilityExpense / totalActiveMembers : 0;
    const baseSharedRentPerMember = totalActiveMembers > 0 ? totalHouseRentExpense / totalActiveMembers : 0;

    const deposits = await Deposit.find({ status: 'approved' });
    let totalDeposit = 0;
    const userDepositMap = new Map();

    deposits.forEach((dep) => {
      const uId = dep.userId.toString();
      const amt = Number(dep.amount) || 0;
      totalDeposit += amt;
      userDepositMap.set(uId, (userDepositMap.get(uId) || 0) + amt);
    });

    const doc = new PDFDocument({ margin: 50 });
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Mess_Report_${currentMonth.replace(' ', '_')}.pdf`);
    
    doc.pipe(res);

    doc.fontSize(20).text('Mess Financial Report', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Month: ${currentMonth}`);
    doc.text(`Generated By: ${req.user.name} (${req.user.role})`);
    doc.text(`Date of Export: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    doc.fontSize(14).text('Overall Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Total Deposit: ${totalDeposit.toFixed(2)} BDT`);
    doc.text(`Total Cost (Shared): ${(totalBazaarExpense + totalUtilityExpense + totalHouseRentExpense).toFixed(2)} BDT`);
    doc.text(`- Bazaar: ${totalBazaarExpense.toFixed(2)} BDT`);
    doc.text(`- Utilities: ${totalUtilityExpense.toFixed(2)} BDT`);
    doc.text(`- House Rent: ${totalHouseRentExpense.toFixed(2)} BDT`);
    doc.text(`Total Meals Consumed: ${totalMealsConsumed}`);
    doc.text(`Current Meal Rate: ${currentMealRate.toFixed(2)} BDT`);
    doc.moveDown();

    doc.fontSize(14).text('Individual Balances', { underline: true });
    doc.moveDown(0.5);

    activeMembers.forEach((member, index) => {
      const memberId = member._id.toString();
      const individualMeals = userMealMap.get(memberId) || 0;
      const individualDeposit = userDepositMap.get(memberId) || 0;

      const mealCost = individualMeals * currentMealRate;
      const exemptionDeduction = userExemptedCostMap.get(memberId) || 0;
      const trueSharedCost = (baseSharedUtilityPerMember + baseSharedRentPerMember) - exemptionDeduction;
      const personalExtraCost = userPersonalCostMap.get(memberId) || 0;

      const totalMemberCost = Number((mealCost + trueSharedCost + personalExtraCost).toFixed(2));
      const balance = Number((individualDeposit - totalMemberCost).toFixed(2));

      const balanceText = balance >= 0 ? `+${balance.toFixed(2)} BDT (Credit)` : `${balance.toFixed(2)} BDT (Due)`;

      doc.fontSize(12).text(`${index + 1}. ${member.name}`);
      doc.fontSize(10).text(`   Meals: ${individualMeals} | Deposit: ${individualDeposit.toFixed(2)} | Meal Cost: ${mealCost.toFixed(2)}`);
      doc.text(`   Shared Bills: ${trueSharedCost.toFixed(2)} | Personal Bills: ${personalExtraCost.toFixed(2)} | Total Cost: ${totalMemberCost.toFixed(2)}`);
      doc.text(`   Final Balance: ${balanceText}`);
      doc.moveDown(0.5);
    });

    doc.end();

  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to generate PDF document.'
      });
    }
  }
};