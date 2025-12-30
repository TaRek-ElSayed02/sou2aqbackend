const blogService = require('../services/blog.service');

exports.createBlog = async (req, res, next) => {
  try {
    const blog = await blogService.createBlog({
      ...req.body,
      image: req.file ? `/uploads/blogImages/${req.file.filename}` : null
    });

    res.status(201).json({
      success: true,
      data: blog
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllBlogs = async (req, res, next) => {
  try {
    const blogs = await blogService.getAllBlogs();
    res.status(200).json({ success: true, data: blogs });
  } catch (error) {
    next(error);
  }
};

exports.getBlogById = async (req, res, next) => {
  try {
    const blog = await blogService.getBlogById(req.params.id);
    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

exports.updateBlog = async (req, res, next) => {
  try {
    const updatedData = {
      ...req.body,
      ...(req.file && {
        image: `/uploads/blogImages/${req.file.filename}`
      })
    };

    const blog = await blogService.updateBlog(req.params.id, updatedData);

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteBlog = async (req, res, next) => {
  try {
    await blogService.deleteBlog(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
