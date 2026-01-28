import {
  Component,
  OnInit,
  OnChanges,
  Input,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { InvoiceEmailService } from './invoice-email.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-invoice-email',
  templateUrl: './invoice-email.component.html',
  styleUrls: ['./invoice-email.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class InvoiceEmailComponent implements OnInit, OnChanges {

  // 🔹 When opened from Aging / AR, we pass the invoice here
  @Input() invoice: any | null = null;

  // flag: true = opened inside modal from another screen
  embeddedMode = false;

  // 'SI' = Sales Invoice, 'PIN' = Supplier Invoice
  docType: 'SI' | 'PIN' = 'SI';

  // invoice dropdown data (for standalone screen)
  invoiceList: any[] = [];
  selectedInvoiceId: number | null = null;

  // document info
  invoiceNo = '';
  partyName = '';
  partyLabel = 'Customer'; // Customer / Supplier

  // email info
  selectedTemplate = 1;
  toEmail = '';
  ccEmail = '';
  subject = '';
  body = '';

  // loading flag
  isSending = false;

  constructor(private emailService: InvoiceEmailService) {}

  // ---------------- LIFECYCLE ----------------
  ngOnInit(): void {
    if (this.invoice) {
      // opened from Aging / other screen
      this.initFromInvoiceInput();
    } else {
      // standalone page
      this.partyLabel = this.docType === 'SI' ? 'Customer' : 'Supplier';
      this.loadInvoiceList();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['invoice'] && changes['invoice'].currentValue) {
      this.initFromInvoiceInput();
    }
  }

  // ---------------- INIT FROM INPUT (PIN FROM AGING) ----------------
  private initFromInvoiceInput(): void {
    if (!this.invoice) return;

    this.embeddedMode = true;

    // force Supplier Invoice by default
    this.docType = (this.invoice.docType as any) || 'PIN';
    this.partyLabel = this.docType === 'SI' ? 'Customer' : 'Supplier';

    // set id + basic info from Aging row
    this.selectedInvoiceId =
      this.invoice.id ??
      this.invoice.invoiceId ??
      null;

    this.invoiceNo =
      this.invoice.invoiceNo ??
      this.invoice.pinNo ??
      '';

    this.partyName =
      this.invoice.partyName ??
      this.invoice.supplierName ??
      '';

    this.toEmail =
      this.invoice.email ??
      this.invoice.supplierEmail ??
      this.invoice.supplierEmailId ??
      '';

    this.ccEmail = this.invoice.ccEmail ?? '';

    // 1) try to enrich from API (email, name, etc.)
    if (this.selectedInvoiceId) {
      this.onInvoiceChange();   // will call loadTemplate() at the end
    } else {
      // 2) if no id, at least apply template using what we have
      this.loadTemplate();
    }
  }

  // change SI / PIN from dropdown (only when NOT embedded)
  onDocTypeChange(): void {
    if (this.embeddedMode) return;  // 🔒 block changes inside modal

    this.partyLabel = this.docType === 'SI' ? 'Customer' : 'Supplier';

    // reset form
    this.selectedInvoiceId = null;
    this.invoiceNo = '';
    this.partyName = '';
    this.toEmail = '';
    this.ccEmail = '';
    this.subject = '';
    this.body = '';

    this.loadInvoiceList();
  }

  // load invoice dropdown based on docType
  loadInvoiceList(): void {
    this.emailService.getInvoiceList(this.docType).subscribe(list => {
      this.invoiceList = list || [];
    });
  }

  // when invoice selected (or auto-selected from Aging)
  onInvoiceChange(): void {
    if (!this.selectedInvoiceId) {
      this.invoiceNo = '';
      this.partyName = '';
      this.toEmail = '';
      this.ccEmail = '';
      this.subject = '';
      this.body = '';
      return;
    }

    this.emailService.getInvoiceInfo(this.docType, this.selectedInvoiceId)
      .subscribe(info => {
        // expected: { id, invoiceNo, partyName, email, ccEmail, ... }
        // but we keep fallbacks from Aging row if any field is missing
        this.invoiceNo =
          info.invoiceNo ??
          info.pinNo ??
          this.invoiceNo;

        this.partyName =
          info.partyName ??
          info.customerName ??
          info.supplierName ??
          this.partyName;

        this.toEmail =
          info.email ||
          info.toEmail ||
          this.toEmail;

        this.ccEmail =
          info.ccEmail ||
          this.ccEmail;

        // apply template with final invoiceNo + partyName
        this.loadTemplate();
      }, _ => {
        // if API fails, still try template with existing values
        this.loadTemplate();
      });
  }

  // get subject/body from template ({{InvoiceNo}}, {{PartyName}})
  loadTemplate(): void {
    // ⛔ only guard on template id
    if (!this.selectedTemplate) return;

    const currentInvoiceNo =
      this.invoiceNo ||
      this.invoice?.invoiceNo ||
      this.invoice?.pinNo ||
      '';

    const currentPartyName =
      this.partyName ||
      this.invoice?.partyName ||
      this.invoice?.supplierName ||
      '';

    this.emailService.getTemplate(this.selectedTemplate, this.docType)
      .subscribe(t => {
        const subjTpl = t.subjectTemplate || '';
        const bodyTpl = t.bodyTemplate || '';

        this.subject = subjTpl
          .replace('{{InvoiceNo}}', currentInvoiceNo)
          .replace('{{PartyName}}', currentPartyName);

        this.body = bodyTpl
          .replace('{{InvoiceNo}}', currentInvoiceNo)
          .replace('{{PartyName}}', currentPartyName);
      });
  }

  onTemplateChange(): void {
    this.loadTemplate();
  }

  // ---------------- SEND EMAIL ----------------
  send(): void {
    const invoiceId = this.selectedInvoiceId;
    if (!invoiceId) {
      Swal.fire('Warning', 'Please select an invoice.', 'warning');
      return;
    }
    if (!this.toEmail) {
      Swal.fire('Warning', 'Recipient email (To) is required.', 'warning');
      return;
    }

    const loginEmail = localStorage.getItem('email') || 'venumuthusamy@gmail.com';
    const loginName  = localStorage.getItem('username') || 'Unity ERP';

    const payload = {
      fromEmail: loginEmail,
      fromName: loginName,
      toEmail: this.toEmail,
      toName: this.partyName,
      subject: this.subject,
      bodyHtml: this.body,
      fileName: `${this.invoiceNo}.pdf`,
      invoiceNo: this.invoiceNo
    };

    this.isSending = true;

    this.emailService.sendEmail(this.docType, invoiceId, payload).subscribe({
      next: res => {
        this.isSending = false;
        Swal.fire({
          icon: res.success ? 'success' : 'info',
          title: res.success ? 'Email Sent' : 'Notice',
          text: res.message || 'Invoice email processed.',
          confirmButtonColor: '#2E5F73'
        });
      },
      error: err => {
        console.error(err);
        this.isSending = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to send invoice email.',
          confirmButtonColor: '#e3342f'
        });
      }
    });
  }
}
