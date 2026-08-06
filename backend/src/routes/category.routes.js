const { Router } = require('express')
const categoryController = require('../controllers/category.controller')
const validate = require('../middlewares/validate.middleware')
const {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  listCategoriesQuerySchema,
} = require('../schemas/category.schema')

const router = Router()

router.get('/', validate(listCategoriesQuerySchema, 'query'), categoryController.list)
router.get('/:id', validate(categoryIdParamSchema, 'params'), categoryController.getById)
router.post('/', validate(createCategorySchema, 'body'), categoryController.create)
router.put(
  '/:id',
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema, 'body'),
  categoryController.update
)
router.delete('/:id', validate(categoryIdParamSchema, 'params'), categoryController.remove)

module.exports = router
