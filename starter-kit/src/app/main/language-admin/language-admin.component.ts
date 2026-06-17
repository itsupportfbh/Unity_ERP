import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageAdminService, LanguageOption, TranslationEntry } from './language-admin.service';

@Component({
  selector: 'app-language-admin',
  templateUrl: './language-admin.component.html',
  styleUrls: ['./language-admin.component.scss']
})
export class LanguageAdminComponent implements OnInit {
  languages: LanguageOption[] = [];
  translations: TranslationEntry[] = [];
  selected: Partial<TranslationEntry> = this.blankEntry();
  loading = false;
  saving = false;
  message = '';
  error = '';

  filters = {
    languageCode: 'en',
    module: '',
    includeInactive: false
  };

  readonly modules = ['Menu', 'Purchase', 'Sales', 'Inventory', 'Financial', 'Master', 'Recipe', 'Common'];
  readonly commonKeys = [
    'MENU.HOME',
    'MENU.MASTER',
    'MENU.PURCHASE.TITLE',
    'MENU.SALES.TITLE',
    'MENU.INVENTORY.TITLE',
    'MENU.FINANCIAL.TITLE',
    'COMMON.SAVE',
    'COMMON.CANCEL',
    'COMMON.SEARCH',
    'COMMON.DELETE'
  ];

  constructor(private languageService: LanguageAdminService, private translateService: TranslateService) {}

  ngOnInit(): void {
    this.loadLanguages();
    this.loadTranslations();
  }

  loadLanguages(): void {
    this.languageService.getLanguages().subscribe({
      next: languages => (this.languages = languages),
      error: () => (this.languages = this.defaultLanguages())
    });
  }

  loadTranslations(): void {
    this.loading = true;
    this.error = '';

    this.languageService.getTranslations(this.filters).subscribe({
      next: rows => {
        this.translations = rows;
        this.loading = false;
      },
      error: () => {
        this.error = 'Translations load panna mudiyala.';
        this.loading = false;
      }
    });
  }

  newEntry(): void {
    this.selected = this.blankEntry();
    this.message = '';
    this.error = '';
  }

  edit(entry: TranslationEntry): void {
    this.selected = { ...entry };
    this.message = '';
    this.error = '';
  }

  useKey(key: string): void {
    this.selected.translationKey = key;
  }

  save(): void {
    this.message = '';
    this.error = '';

    if (!this.selected.languageCode || !this.selected.translationKey || !this.selected.translationValue) {
      this.error = 'Language, key and value required.';
      return;
    }

    this.saving = true;
    this.languageService
      .saveTranslation({
        languageCode: this.selected.languageCode,
        translationKey: this.selected.translationKey,
        translationValue: this.selected.translationValue,
        module: this.selected.module || null,
        isActive: this.selected.isActive !== false
      })
      .subscribe({
        next: () => {
          this.message = 'Translation save aagiduchu.';
          this.saving = false;
          this.loadTranslations();
          this.refreshCurrentLanguage();
        },
        error: () => {
          this.error = 'Translation save panna mudiyala.';
          this.saving = false;
        }
      });
  }

  deactivate(entry: TranslationEntry): void {
    this.saving = true;
    this.languageService.deactivateTranslation(entry.id).subscribe({
      next: () => {
        this.message = 'Translation inactive aagiduchu.';
        this.saving = false;
        this.newEntry();
        this.loadTranslations();
        this.refreshCurrentLanguage();
      },
      error: () => {
        this.error = 'Translation deactivate panna mudiyala.';
        this.saving = false;
      }
    });
  }

  applyLanguage(): void {
    this.languageService.getDictionary(this.filters.languageCode).subscribe({
      next: dictionary => {
        this.translateService.setTranslation(this.filters.languageCode, this.expandDictionary(dictionary), true);
        this.translateService.use(this.filters.languageCode);
        this.message = 'Language apply aagiduchu.';
      },
      error: () => (this.error = 'Language apply panna mudiyala.')
    });
  }

  trackById(_: number, item: TranslationEntry): number {
    return item.id;
  }

  private refreshCurrentLanguage(): void {
    if (this.selected.languageCode === this.translateService.currentLang) {
      this.applyLanguage();
    }
  }

  private blankEntry(): Partial<TranslationEntry> {
    return {
      languageCode: this.filters.languageCode,
      module: 'Common',
      translationKey: '',
      translationValue: '',
      isActive: true
    };
  }

  private expandDictionary(flat: Record<string, string>): any {
    const output = {};
    Object.keys(flat || {}).forEach(key => {
      const parts = key.split('.');
      let cursor = output;
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          cursor[part] = flat[key];
        } else {
          cursor[part] = cursor[part] || {};
          cursor = cursor[part];
        }
      });
    });
    return output;
  }

  private defaultLanguages(): LanguageOption[] {
    return [
      { code: 'en', name: 'English', isActive: true },
      { code: 'zh', name: 'Chinese', isActive: true },
      { code: 'ms', name: 'Malay', isActive: true },
      { code: 'ta', name: 'Tamil', isActive: true }
    ];
  }
}
