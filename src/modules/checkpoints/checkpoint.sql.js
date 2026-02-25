module.exports = {
  getById: `
    SELECT * FROM checkpoints WHERE id = $1
  `,
  
  getByContractId: `
    SELECT * FROM checkpoints WHERE contract_id = $1 ORDER BY created_at ASC
  `,

  submit: `
    UPDATE checkpoints
    SET status = 'SUBMITTED',
        submission_url = $2,
        submission_notes = $3,
        submitted_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
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
