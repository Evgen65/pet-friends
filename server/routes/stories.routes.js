const express = require('express');
const router = express.Router();
const {
  getStories,
  getStory,
  createStory,
  updateStory,
  deleteStory,
} = require('../controllers/stories.controller');

router.get('/',       getStories);
router.get('/:id',    getStory);
router.post('/',      createStory);
router.put('/:id',    updateStory);
router.delete('/:id', deleteStory);

module.exports = router;
