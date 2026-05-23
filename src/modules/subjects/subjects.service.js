const { toCreateSubjectData, toUpdateSubjectData } = require('./subjects.dto');
const { toSubjectDto } = require('./subjects.mapper');
const { subjectsRepository } = require('./subjects.repository');
const { validateCreateSubject, validateUpdateSubject } = require('./subjects.validation');

class SubjectsService {
  constructor(repository = subjectsRepository) {
    this.repository = repository;
  }

  async listSubjects(query = {}) {
    const subjects = await this.repository.findAll({ search: query.search || '' });
    return subjects.map(toSubjectDto);
  }

  async createSubject(input) {
    validateCreateSubject(input);
    const subject = await this.repository.create(toCreateSubjectData(input));
    return toSubjectDto(subject);
  }

  async updateSubject(id, input) {
    validateUpdateSubject(input);
    const subject = await this.repository.update(id, toUpdateSubjectData(input));
    return toSubjectDto(subject);
  }

  async deleteSubject(id) {
    await this.repository.delete(id);
  }
}

module.exports = { SubjectsService, subjectsService: new SubjectsService() };
