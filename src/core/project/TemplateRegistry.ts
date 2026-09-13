import type { AssetCategory } from './AssetCategory';
import type { Template, TemplateId } from './Template';

/**
 * Holds Templates by id. Registering one is a pure-data `register()` call —
 * never an editor code change (V2 coding-phases Phase 2 rule: "adding a new
 * template must never require an editor code change").
 */
export class TemplateRegistry {
  readonly #templates = new Map<TemplateId, Template>();

  constructor(templates: readonly Template[] = []) {
    for (const template of templates) {
      this.register(template);
    }
  }

  register(template: Template): void {
    this.#templates.set(template.id, template);
  }

  get(id: TemplateId): Template | undefined {
    return this.#templates.get(id);
  }

  list(): readonly Template[] {
    return [...this.#templates.values()];
  }

  listByCategory(category: AssetCategory): readonly Template[] {
    return this.list().filter((template) => template.category === category);
  }
}
