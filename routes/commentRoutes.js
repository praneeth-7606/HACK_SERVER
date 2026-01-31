const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    addComment,
    getComments,
    deleteComment
} = require('../controllers/commentController');

router.use(protect);

router.route('/:concernId')
    .get(getComments)
    .post(addComment);

router.route('/item/:id') // Use /item/:id to distinguish from concernId param if needed, but since IDs are unique we can also check validity. 
// Actually standard practice is usually /:concernId/comments but here I am making a separate top level route /api/comments.
// So:
// POST /api/comments/:concernId -> Add
// GET /api/comments/:concernId -> List
// DELETE /api/comments/:id -> Delete (using a different path structure or checkingparam)

// Let's adjust:
// GET/POST on /:concernId is ambiguous with DELETE on /:id if they are both ID strings. 
// A better REST structure might be:
// router.get('/:concernId', getComments);
// router.post('/:concernId', addComment);
// router.delete('/:id', deleteComment); -> This will conflict if I'm not careful.
// Let's use explicit paths for clarity.

router.get('/:concernId', getComments);
router.post('/:concernId', addComment);
router.delete('/:id', deleteComment);

module.exports = router;
