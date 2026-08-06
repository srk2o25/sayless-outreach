import { Component, OnInit, inject } from "@angular/core";
import { NgForOf, NgIf } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Observable, catchError, of } from "rxjs";
import { TemplatesService } from "../../core/services/templates.service";
import { TemplateCategory } from "../../core/models/template-category.model";
import { Template } from "../../core/models/template.model";

const ACTION_TYPE_LABELS: Record<Template["actionType"], string> = {
  li_message: "LinkedIn Message",
  email: "Email",
  email_followup: "Follow-up Email",
};

interface EditForm {
  subject: string;
  bodyTemplate: string;
}

@Component({
  selector: "cad-templates",
  standalone: true,
  imports: [NgForOf, NgIf, FormsModule],
  templateUrl: "./templates.component.html",
  styleUrl: "./templates.component.scss",
})
export class TemplatesComponent implements OnInit {
  private readonly templatesService = inject(TemplatesService);

  protected categories: TemplateCategory[] = [];
  protected loadingCategories = true;
  protected selectedCategoryId: number | null = null;
  protected templates: Template[] = [];
  protected loadingTemplates = false;
  protected newCategoryName = "";
  protected editingTemplateId: number | null = null;
  protected editForm: EditForm = { subject: "", bodyTemplate: "" };

  public ngOnInit(): void {
    this.loadCategories();
  }

  protected actionTypeLabel(actionType: Template["actionType"]): string {
    return ACTION_TYPE_LABELS[actionType];
  }

  protected trackByCategoryId(_index: number, category: TemplateCategory): number {
    return category.id;
  }

  protected trackByTemplateId(_index: number, template: Template): number {
    return template.id;
  }

  protected selectCategory(categoryId: number): void {
    this.selectedCategoryId = categoryId;
    this.editingTemplateId = null;
    this.loadTemplates();
  }

  protected createCategory(): void {
    const name = this.newCategoryName.trim();
    if (!name) return;

    this.templatesService
      .createCategory(name)
      .pipe(
        catchError((): Observable<TemplateCategory | null> => {
          return of(null);
        })
      )
      .subscribe((category: TemplateCategory | null) => {
        if (category) {
          this.categories = [...this.categories, category].sort((a, b) => a.name.localeCompare(b.name));
          this.newCategoryName = "";
          this.selectCategory(category.id);
        }
      });
  }

  protected deleteCategory(category: TemplateCategory): void {
    const confirmed = window.confirm(`Delete "${category.name}"? This removes all its templates — this can't be undone.`);
    if (!confirmed) return;

    this.templatesService
      .deleteCategory(category.id)
      .pipe(
        catchError((): Observable<{ ok: boolean; id: number | null }> => {
          return of({ ok: false, id: null });
        })
      )
      .subscribe((result: { ok: boolean; id: number | null }) => {
        if (result.ok) {
          this.categories = this.categories.filter((c) => c.id !== category.id);
          if (this.selectedCategoryId === category.id) {
            this.selectedCategoryId = null;
            this.templates = [];
          }
        }
      });
  }

  protected startEdit(template: Template): void {
    this.editingTemplateId = template.id;
    this.editForm = { subject: template.subject ?? "", bodyTemplate: template.bodyTemplate };
  }

  protected cancelEdit(): void {
    this.editingTemplateId = null;
  }

  protected saveEdit(template: Template): void {
    const updated: Template = {
      ...template,
      subject: template.actionType === "li_message" ? null : this.editForm.subject,
      bodyTemplate: this.editForm.bodyTemplate,
    };
    this.templates = this.templates.map((t) => (t.id === template.id ? updated : t));
    this.editingTemplateId = null;
    this.templatesService.updateTemplate(updated).subscribe();
  }

  private loadCategories(): void {
    this.loadingCategories = true;
    this.templatesService
      .listCategories()
      .pipe(
        catchError((): Observable<TemplateCategory[]> => {
          return of([]);
        })
      )
      .subscribe((categories: TemplateCategory[]) => {
        this.categories = categories;
        this.loadingCategories = false;
        if (categories.length > 0 && this.selectedCategoryId === null) {
          this.selectCategory(categories[0].id);
        }
      });
  }

  private loadTemplates(): void {
    if (this.selectedCategoryId === null) {
      this.templates = [];
      return;
    }

    this.loadingTemplates = true;
    this.templatesService
      .listTemplates(this.selectedCategoryId)
      .pipe(
        catchError((): Observable<Template[]> => {
          return of([]);
        })
      )
      .subscribe((templates: Template[]) => {
        this.templates = templates;
        this.loadingTemplates = false;
      });
  }
}
