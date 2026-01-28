const {
  createJobWithContractAndCheckpoints,
} = require('./job.service');

const PLATFORM_FEE_PERCENT = 3; // 3%

const ALLOWED_JOB_TYPES = ['SHORT_TERM', 'LONG_TERM'];

function validateCreateJobPayload(body) {
  const errors = [];

  const { title, description, jobType, budget, checkpoints } = body;

  if (!title) {
    errors.push('title is required');
  }

  if (!jobType) {
    errors.push('jobType is required');
  } else if (!ALLOWED_JOB_TYPES.includes(jobType)) {
    errors.push(`jobType must be one of: ${ALLOWED_JOB_TYPES.join(', ')}`);
  }

  const budgetNum = Number(budget);
  if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
    errors.push('budget must be a positive number');
  }

  if (!Array.isArray(checkpoints) || checkpoints.length === 0) {
    errors.push('at least one checkpoint is required');
  } else {
    let sum = 0;

    checkpoints.forEach((cp, index) => {
      if (!cp.title) {
        errors.push(`checkpoints[${index}].title is required`);
      }

      const amountNum = Number(cp.amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        errors.push(`checkpoints[${index}].amount must be a positive number`);
      }

      sum += amountNum;
    });

    if (Number.isFinite(budgetNum) && sum !== budgetNum) {
      errors.push(
        `sum of checkpoint amounts (${sum}) must equal budget (${budgetNum})`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const BASE_CONTRACT_TEMPLATE = {
  title: 'FAF Standard Service Contract',
  defaultClauses: [
    'Thanh toán theo từng checkpoint đã được client duyệt.',
    'Client phải nạp đủ total_amount vào escrow trước khi bắt đầu làm.',
    'Tranh chấp sẽ được giải quyết theo quy trình dispute của FAF.',
  ],
};

/**
 * POST /api/jobs
 * Chỉ CLIENT (task owner) được tạo job
 * Body expected (theo UI):
 * {
 *   title: string,
 *   description?: string,
 *   jobType: 'SHORT_TERM' | 'LONG_TERM',
 *   budget: number,
 *   checkpoints: [
 *     { title: string, description?: string, amount: number },
 *     ...
 *   ]
 * }
 */
async function createJob(req, res) {
  try {
    const user = req.user; // gán từ JWT middleware

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (user.role !== 'employer') {
      return res.status(403).json({
        message: 'Only clients (task owners) can create jobs',
      });
    }

    const { title, description, jobType, budget, checkpoints } = req.body;

    const { isValid, errors } = validateCreateJobPayload(req.body);

    if (!isValid) {
      return res.status(400).json({
        message: 'Invalid request body',
        errors,
      });
    }

    const budgetNum = Number(budget);

    const {
      job,
      contract,
      checkpoints: createdCheckpoints,
    } = await createJobWithContractAndCheckpoints({
      clientId: user.id, // payload JWT phải có field id map với users.id
      title,
      description,
      jobType,
      budget: budgetNum,
      checkpoints: checkpoints.map((cp) => ({
        title: cp.title,
        description: cp.description,
        amount: Number(cp.amount),
      })),
    });

    // Tính summary cho UI Budget & Checkpoints
    const platformFeeAmount = Math.round(
      (budgetNum * PLATFORM_FEE_PERCENT) / 100,
    );

    const summary = {
      totalJobBudget: budgetNum,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      platformFeeAmount,
      totalEscrow: budgetNum,
      clientPays: budgetNum + platformFeeAmount,
      workerEarns: budgetNum,
    };

    return res.status(201).json({
      message: 'Job created successfully',
      data: {
        job,
        contract,
        checkpoints: createdCheckpoints,
        summary,
        contractTemplate: {
          ...BASE_CONTRACT_TEMPLATE,
          customClauses: [], // FE cho task owner thêm, nhưng không xoá defaultClauses
        },
      },
    });
  } catch (error) {
    console.error('Error in createJob controller:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  createJob,
};