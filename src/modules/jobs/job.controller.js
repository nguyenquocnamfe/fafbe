const { createJobWithContractAndCheckpoints, getJobById,
  listJobs,
  updateJob,
  deleteJob, } = require("./job.service");
const { getCategoryById } = require("../category/cate.service");

const PLATFORM_FEE_PERCENT = 3; // 3%

const ALLOWED_JOB_TYPES = ["SHORT_TERM", "LONG_TERM"];

function validateCreateJobPayload(body) {
  const errors = [];

  const { title, description, jobType, budget, checkpoints, categoryId } = body;

  console.log(checkpoints)

  if (!title) {
    errors.push("title is required");
  }

  if (!categoryId || !Number.isInteger(Number(categoryId))) {
    errors.push("categoryId is required and must be a number");
  }

  if (!jobType) {
    errors.push("jobType is required");
  } else if (!ALLOWED_JOB_TYPES.includes(jobType)) {
    errors.push(`jobType must be one of: ${ALLOWED_JOB_TYPES.join(", ")}`);
  }

  const budgetNum = Number(budget);
  if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
    errors.push("budget must be a positive number");
  }

  if (!Array.isArray(checkpoints) || checkpoints.length === 0) {
    errors.push("at least one checkpoint is required");
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
  title: "FAF Standard Service Contract",
  defaultClauses: [
    "Thanh toán theo từng checkpoint đã được client duyệt.",
    "Client phải nạp đủ total_amount vào escrow trước khi bắt đầu làm.",
    "Tranh chấp sẽ được giải quyết theo quy trình dispute của FAF.",
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
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.role !== "employer") {
      return res.status(403).json({
        message: "Only clients (task owners) can create jobs",
      });
    }

    // ✅ 1. Destructure trước
    const {
      title,
      description,
      jobType,
      budget,
      checkpoints,
      contractContent,
      categoryId,
      skills,
    } = req.body;

    // ✅ 2. Validate payload
    const { isValid, errors } = validateCreateJobPayload(req.body);
    if (!isValid) {
      return res.status(400).json({
        message: "Invalid request body",
        errors,
      });
    }

    // ✅ 3. Validate category tồn tại & active
    const category = await getCategoryById(Number(categoryId));
    if (!category || !category.is_active) {
      return res.status(400).json({
        message: "Invalid or inactive category",
      });
    }

    const budgetNum = Number(budget);

    // ✅ 4. Create job + contract + checkpoints
    const {
      job,
      contract,
      checkpoints: createdCheckpoints,
    } = await createJobWithContractAndCheckpoints({
      clientId: user.id,
      title,
      description,
      jobType,
      budget: budgetNum,
      checkpoints: checkpoints.map((cp) => ({
        title: cp.title,
        description: cp.description,
        amount: Number(cp.amount),
        due_date: cp.due_date ? new Date(cp.due_date) : null,
      })),
      contractContent,
      categoryId: Number(categoryId),
      skills,
    });

    const platformFeeAmount = Math.round(
      (budgetNum * PLATFORM_FEE_PERCENT) / 100,
    );

    return res.status(201).json({
      message: "Job created successfully",
      data: {
        job,
        contract,
        checkpoints: createdCheckpoints,
        summary: {
          totalJobBudget: budgetNum,
          platformFeePercent: PLATFORM_FEE_PERCENT,
          platformFeeAmount,
          totalEscrow: budgetNum,
          clientPays: budgetNum + platformFeeAmount,
          workerEarns: budgetNum,
        },
      },
    });
  } catch (error) {
    if (error.message === "NOT_ENOUGH_POINTS") {
      return res.status(400).json({
        message: "Not enough points to create job",
      });
    }

    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}


/* =========================
   GET /api/jobs/:id
========================= */
async function getJob(req, res) {
  const job = await getJobById(Number(req.params.id));

  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  return res.json({ data: job });
}

/* =========================
   GET /api/jobs
========================= */
async function getListJobs(req, res) {
  const jobs = await listJobs({
    status: req.query.status,
    categoryId: req.query.categoryId,
    clientId: req.query.clientId,
  });

  return res.json({ data: jobs });
}


/* =========================
   PUT /api/jobs/:id
========================= */
async function updateJobHandler(req, res) {
  const jobId = Number(req.params.id);

  const job = await updateJob(jobId, req.body);

  return res.json({
    message: 'Job updated successfully',
    data: job,
  });
}

/* =========================
   DELETE /api/jobs/:id
========================= */
async function deleteJobHandler(req, res) {
  const success = await deleteJob(Number(req.params.id));

  if (!success) {
    return res.status(404).json({ message: 'Job not found' });
  }

  return res.json({ message: 'Job deleted successfully' });
}

module.exports = {
  createJob,
  getJob,
  getListJobs,
  updateJobHandler,
  deleteJobHandler,
};
