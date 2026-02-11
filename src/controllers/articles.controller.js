const articlesService = require('../services/articles.service');
const fs = require('fs');
const path = require('path');
const { deleteUploadedImage } = require('../middleware/blogUpload.middleware');

exports.createArticle = async (req, res, next) => {
  try {
    if (!req.body.title || !req.body.content) {
      if (req.file) deleteUploadedImage(req.file.filename);
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/blogImages/${req.file.filename}`;
    }

    const articleData = {
      title: req.body.title,
      content: req.body.content,
      image: imagePath,
      description: req.body.description || null,
      url: req.body.url || null,
      category: req.body.category || null,
      imgAlt: req.body.imgAlt || null,
      tags: req.body.tags || null,
      author: req.body.author || null,
      siteId: req.body.siteId || null
    };

    const article = await articlesService.createArticle(articleData);

    res.status(201).json({ success: true, data: article, message: 'Article created successfully' });
  } catch (error) {
    if (req.file) deleteUploadedImage(req.file.filename);
    next(error);
  }
};

exports.getAllArticles = async (req, res, next) => {
  try {
    const articles = await articlesService.getAllArticles();
    res.status(200).json({ success: true, count: articles.length, data: articles });
  } catch (error) {
    next(error);
  }
};

exports.getArticlesBySiteId = async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const articles = await articlesService.getArticlesBySiteId(siteId);
    res.status(200).json({ success: true, count: articles.length, data: articles });
  } catch (error) {
    next(error);
  }
};

exports.getArticleById = async (req, res, next) => {
  try {
    const article = await articlesService.getArticleById(req.params.id);
    res.status(200).json({ success: true, data: article });
  } catch (error) {
    next(error);
  }
};

exports.updateArticle = async (req, res, next) => {
  try {
    const updatedData = { ...req.body };
    if (req.file) {
      const newImagePath = `/uploads/blogImages/${req.file.filename}`;
      updatedData.image = newImagePath;
      await articlesService.deleteOldImage(req.params.id, newImagePath);
    }

    const article = await articlesService.updateArticle(req.params.id, updatedData);
    res.status(200).json({ success: true, data: article, message: 'Article updated successfully' });
  } catch (error) {
    if (req.file) deleteUploadedImage(req.file.filename);
    next(error);
  }
};

exports.deleteArticle = async (req, res, next) => {
  try {
    const result = await articlesService.deleteArticle(req.params.id);
    res.status(200).json({ success: true, message: result.message || 'Article deleted successfully' });
  } catch (error) {
    next(error);
  }
};
