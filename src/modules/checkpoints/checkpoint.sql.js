module.exports = {
  getById: `
    SELECT * FROM checkpoints WHERE id = $1
  `,
  
  getByContractId: `
    SELECT * FROM checkpoints WHERE contract_id = $1 ORDER BY created_at ASC
  `,

  submit: `
    INSERT INTO checkpoint_submissions (
      checkpoint_id, worker_id, submission_data, status, submitted_at
    )
    VALUES ($1, $2, $3, 'PENDING', NOW())
    RETURNING *
  `,

  updateStatus: `
    UPDATE checkpoints
    SET status = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `,

  updateSubmissionStatus: `
    UPDATE checkpoint_submissions
    SET status = $2
    WHERE id = $1
    RETURNING *
  `,
  
  getSubmissionById: `
    SELECT * FROM checkpoint_submissions WHERE id = $1
  `
};
