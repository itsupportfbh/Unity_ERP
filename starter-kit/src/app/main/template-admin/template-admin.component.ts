import { Component, OnInit } from '@angular/core';
import { CommunicationTemplate, TemplateAdminService, TemplatePreview } from './template-admin.service';

@Component({
  selector: 'app-template-admin',
  templateUrl: './template-admin.component.html',
  styleUrls: ['./template-admin.component.scss']
})
export class TemplateAdminComponent implements OnInit {
  templates: CommunicationTemplate[] = [];
  selected: Partial<CommunicationTemplate> = this.blankTemplate();
  previewData: TemplatePreview = { subject: '', body: '' };
  loading = false;
  saving = false;
  message = '';
  error = '';

  filters = {
    channel: '',
    documentType: '',
    includeInactive: false
  };

  readonly channels = ['Email', 'WhatsApp'];
  readonly documentTypes = [
    'Sales Invoice',
    'Supplier Invoice',
    'Quotation',
    'RFQ',
    'Purchase Order',
    'GRN',
    'Payment Reminder',
    'Custom'
  ];

  readonly tokens = ['{{InvoiceNo}}', '{{DocumentNo}}', '{{PartyName}}', '{{Amount}}', '{{Date}}', '{{CompanyName}}', '{{Link}}'];

  constructor(private templateService: TemplateAdminService) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loading = true;
    this.error = '';

    this.templateService.getTemplates(this.filters).subscribe({
      next: templates => {
        this.templates = templates;
        this.loading = false;
      },
      error: () => {
        this.error = 'Template list load panna mudiyala.';
        this.loading = false;
      }
    });
  }

  newTemplate(): void {
    this.selected = this.blankTemplate();
    this.previewData = { subject: '', body: '' };
    this.message = '';
    this.error = '';
  }

  editTemplate(template: CommunicationTemplate): void {
    this.selected = { ...template };
    this.preview();
  }

  save(): void {
    this.message = '';
    this.error = '';

    if (!this.selected.templateName || !this.selected.bodyTemplate) {
      this.error = 'Template name and body required.';
      return;
    }

    this.saving = true;
    const request = {
      templateName: this.selected.templateName,
      channel: this.selected.channel || 'Email',
      documentType: this.selected.documentType || null,
      subjectTemplate: this.selected.subjectTemplate || '',
      bodyTemplate: this.selected.bodyTemplate || '',
      languageCode: this.selected.languageCode || null,
      isDefault: !!this.selected.isDefault,
      isActive: this.selected.isActive !== false
    };

    const save$ = this.selected.id
      ? this.templateService.updateTemplate(this.selected.id, request)
      : this.templateService.createTemplate(request);

    save$.subscribe({
      next: () => {
        this.message = 'Template save aagiduchu.';
        this.saving = false;
        this.loadTemplates();
        if (!this.selected.id) {
          this.newTemplate();
        }
      },
      error: () => {
        this.error = 'Template save panna mudiyala.';
        this.saving = false;
      }
    });
  }

  deactivate(): void {
    if (!this.selected.id) {
      return;
    }

    this.saving = true;
    this.templateService.deactivateTemplate(this.selected.id).subscribe({
      next: () => {
        this.message = 'Template inactive aagiduchu.';
        this.saving = false;
        this.newTemplate();
        this.loadTemplates();
      },
      error: () => {
        this.error = 'Template deactivate panna mudiyala.';
        this.saving = false;
      }
    });
  }

  preview(): void {
    this.templateService
      .preview(this.selected.subjectTemplate || '', this.selected.bodyTemplate || '')
      .subscribe({
        next: preview => (this.previewData = preview || { subject: '', body: '' }),
        error: () => (this.previewData = { subject: '', body: '' })
      });
  }

  insertToken(token: string, field: 'subjectTemplate' | 'bodyTemplate'): void {
    const current = (this.selected[field] as string) || '';
    this.selected[field] = `${current}${current ? ' ' : ''}${token}`;
    this.preview();
  }

  trackById(_: number, item: CommunicationTemplate): number {
    return item.id;
  }

  private blankTemplate(): Partial<CommunicationTemplate> {
    return {
      channel: 'Email',
      documentType: 'Custom',
      subjectTemplate: '',
      bodyTemplate: '',
      languageCode: 'en',
      isActive: true,
      isDefault: false
    };
  }
}
