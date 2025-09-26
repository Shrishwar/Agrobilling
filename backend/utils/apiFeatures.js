const { Op } = require('sequelize');
const { ValidationError } = require('./errorResponse');

class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    
    // Remove special fields from query params
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering with operators (gt, gte, lt, lte, in, etc.)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|ne|in|nin|eq)\b/g, match => `$${match}`);
    
    try {
      const parsedQuery = JSON.parse(queryStr);
      this.query = this.query.find(parsedQuery);
    } catch (error) {
      throw new ValidationError('Invalid query parameters');
    }

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      // Default sorting by creation date (newest first)
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      // Exclude __v field by default
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    
    // Add pagination info to the query object for later use
    this.pagination = {
      currentPage: page,
      limit,
      skip
    };

    return this;
  }

  search(fields = []) {
    if (this.queryString.search && fields.length > 0) {
      const searchTerm = this.queryString.search;
      const searchConditions = fields.map(field => ({
        [field]: { $regex: searchTerm, $options: 'i' }
      }));

      this.query = this.query.find({ $or: searchConditions });
    }

    return this;
  }

  // For text search with MongoDB text index
  textSearch(fields = []) {
    if (this.queryString.q) {
      const searchTerm = this.queryString.q;
      
      if (fields.length > 0) {
        // If specific fields are provided, search within those fields
        const searchConditions = fields.map(field => ({
          [field]: { $regex: searchTerm, $options: 'i' }
        }));
        
        this.query = this.query.find({ $or: searchConditions });
      } else {
        // Otherwise, use MongoDB text search (requires text index)
        this.query = this.query.find({ $text: { $search: searchTerm } });
      }
    }

    return this;
  }

  // For date range filtering
  dateRange(dateField = 'createdAt') {
    const { startDate, endDate } = this.queryString;
    
    if (startDate || endDate) {
      const dateFilter = {};
      
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      
      if (endDate) {
        dateFilter.$lte = new Date(endDate);
      }
      
      this.query = this.query.find({ [dateField]: dateFilter });
    }

    return this;
  }

  // For populating referenced documents
  populate(populateOptions) {
    if (populateOptions) {
      this.query = this.query.populate(populateOptions);
    }

    return this;
  }

  // Execute the query and return the results
  async execute() {
    // Execute the query
    const results = await this.query;
    
    // If pagination was applied, get the total count
    if (this.pagination) {
      const total = await this.query.model.countDocuments(this.query.getQuery());
      const totalPages = Math.ceil(total / this.pagination.limit);
      
      return {
        success: true,
        count: results.length,
        total,
        totalPages,
        currentPage: this.pagination.currentPage,
        results
      };
    }
    
    return results;
  }
}

module.exports = APIFeatures;
