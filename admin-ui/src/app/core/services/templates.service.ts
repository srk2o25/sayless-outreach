import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { TemplateCategory } from "../models/template-category.model";
import { Template } from "../models/template.model";

@Injectable({ providedIn: "root" })
export class TemplatesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.n8nWebhookBaseUrl;

  public listCategories(): Observable<TemplateCategory[]> {
    return this.http.get<TemplateCategory[]>(`${this.baseUrl}/template-categories`);
  }

  public createCategory(name: string): Observable<TemplateCategory> {
    return this.http.post<TemplateCategory>(`${this.baseUrl}/template-categories`, { name });
  }

  public deleteCategory(id: number): Observable<{ ok: boolean; id: number | null }> {
    return this.http.post<{ ok: boolean; id: number | null }>(`${this.baseUrl}/template-categories/delete`, { id });
  }

  public listTemplates(categoryId: number): Observable<Template[]> {
    return this.http.get<Template[]>(`${this.baseUrl}/templates?categoryId=${categoryId}`);
  }

  public updateTemplate(template: Template): Observable<Template> {
    return this.http.put<Template>(`${this.baseUrl}/templates`, template);
  }
}
