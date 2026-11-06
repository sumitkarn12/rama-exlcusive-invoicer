let invoice = null;
const searchHistory = new Set();
const readableDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
const rupees = new Intl.NumberFormat('en-IN');

let totalQty = 0;
let grandTotal = 0;

const previewEL = document.querySelector("#paperPreview");
previewEL.classList.add("is-hidden");

const searchInvoiceEL = document.querySelector("#invoice-form");
searchInvoiceEL.addEventListener( "submit", async el => {
  el.preventDefault();
  console.log( "INVOICE NUMBER", el.target.querySelector("input").value);
  previewEL.classList.add("is-hidden");
  el.target.querySelector("button").classList.add("is-loading");
  el.target.querySelectorAll("button,input").forEach( e => {
    e.setAttribute("disabled", "");
  });
  const invoice_nr = el.target.querySelector("input").value.trim();
  const url = `https://rama-exclusive-invoice.thespj.workers.dev/?q=${invoice_nr}`;
  invoice = JSON.parse(sessionStorage.getItem( invoice_nr ));
  if ( !invoice ) {
    invoice = await fetch( url ).then( res => res.json() )
    sessionStorage.setItem(invoice_nr, JSON.stringify( invoice ))
  }
  try {
    updatePreview();
    previewEL.classList.remove("is-hidden");
    // location.hash = invoice_nr;
    searchHistory.add( invoice_nr );
    localStorage.setItem( "HISTORY", JSON.stringify( Array.from( searchHistory ).slice(0,20) ) );
    updateSearchHistory();
  } catch(e) {
    if ( invoice.error ) {
      searchHistory.delete( invoice_nr );
      localStorage.setItem( "HISTORY", JSON.stringify( Array.from( searchHistory ).slice(0,20) ) );
      updateSearchHistory();
      alert( invoice.error );
    }
  } finally {
    el.target.querySelector("button").classList.remove("is-loading");
    el.target.querySelectorAll("button,input").forEach( e => {
      e.removeAttribute("disabled");
    });
  }
});

function updateSearchHistory() {
  let savedHistory = JSON.parse(localStorage.getItem("HISTORY"));
  if ( !savedHistory ) return;
  savedHistory.forEach( h => searchHistory.add( h ) );
  let btns = document.querySelector("#search-history");
  btns.innerHTML = "";
  savedHistory.forEach( h => {
    let b = document.createElement( "button" );
    b.classList.add("button", "is-rounded");
    if ( location.hash.substring(1) ==h )
      b.classList.add("is-primary")
    b.innerText = h;
    b.onclick = e => {
      searchInvoiceEL.querySelector("input").value = h;
      searchInvoiceEL.requestSubmit();
    }
    btns.append( b );
  });
}

function updatePreview() {
  document.getElementById('previewStoreName').innerText = invoice.store.name;
  document.getElementById('previewStoreAddress').innerText = invoice.store.address+", "+invoice.store.city;
  document.getElementById('previewStorePhone').innerText = invoice.store.phone;
  document.getElementById('previewStoreEmail').innerText = invoice.store.email;
  document.getElementById('previewStoreGstin').innerText = invoice.store.gstin;
  document.getElementById('previewInvoiceId').innerText = invoice.invoice.id;
  document.getElementById('previewInvoiceDate').innerText = readableDate.format(new Date(invoice.items[0].created_at));
  document.getElementById('previewCustName').innerText = invoice.invoice.name;
  document.getElementById('previewCustPhone').innerText = invoice.invoice.phone;

  let previewTableHTML = '';

  totalQty = 0;
  grandTotal = 0;

  invoice.items = invoice.items.sort( (a,b) => b.amount - a.amount );

  invoice.items.forEach((item, index) => {
    totalQty += Number(item.qty);
    grandTotal += Number(item.amount);

    previewTableHTML += `
                    <tr>
                        <td>${item.article !== '' ? item.article_no + ' ' : ''}${item.variant}</td>
                        <td class="has-text-center">${item.qty}</td>
                        <td class="has-text-right">₹${rupees.format( item.amount )}</td>
                    </tr>
                `;
  });

  document.getElementById('previewTableBody').innerHTML = previewTableHTML;
  document.getElementById('previewTotalUnits').innerText = `${totalQty} unit`;
  document.getElementById('previewTotalAmount').innerText = `₹${rupees.format(grandTotal)}`;
  previewEL.classList.remove("is-hidden");
}

function generatePDF() {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let pageY = 0;
  let margin = 14;

  console.log( "PageW", pageW, "PageH", pageH );

  doc.setFillColor(60, 74, 250);
  doc.rect(0, 0, pageW, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  pageY = 18
  doc.text(invoice.store.name.toUpperCase(), margin, pageY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(211, 211, 211);
  pageY += 4;
  doc.text(invoice.store.address+", "+invoice.store.city, margin, pageY);
  pageY += 4;
  doc.text(`GSTIN: ${invoice.store.gstin}`, margin, pageY);
  pageY += 4;
  doc.text(`Phone: ${invoice.store.phone} | Email: ${invoice.store.email}`, margin, pageY);

  pageY += 6;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, pageY, pageW - (margin*2), 12, 2, 2, 'F');

  pageY += 7;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(readableDate.format(new Date(invoice.items[0].created_at) ), (margin+4), pageY);
  doc.text(invoice.invoice.id, pageW-(margin+4), pageY, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  pageY += 10
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, pageY, pageW - (margin*2), 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  pageY += 8;
  doc.text(invoice.invoice.name, margin+4, pageY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  pageY += 4;
  let csContact = [];
  if ( invoice.invoice.phone ) csContact.push(`Phone: ${invoice.invoice.phone}`)
  if ( invoice.invoice.email ) csContact.push(`Email: ${invoice.invoice.email}`)
  doc.text(csContact.join(" | "), margin+4, pageY);

  const tableRows = invoice.items.map((item, index) => [
    index + 1,
    item.article_no,
    item.variant,
    item.qty,
    `Rs. ${rupees.format(item.mrp)}`,
    `Rs. ${rupees.format(item.amount)}`
  ]);

  pageY += 10;
  doc.autoTable({
    startY: pageY,
    head: [['#', 'Article', 'Variant', 'Qty', 'MRP', 'Amount']],
    body: tableRows,
    theme: 'striped',
    headStyles: { halign: 'center', fillColor: [32, 156, 238], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' }
    },
    theme: 'grid'
  });

  pageY = doc.lastAutoTable.finalY + 8;
  let totalFooterBlockH = 38;

  if ( pageY+totalFooterBlockH >= pageH ) {
    doc.addPage("a4", "p");
    pageY = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(140, pageY, pageW-140-margin, 20, 2, 2, 'F');
  pageY += 8;
  doc.text(`Total Units: ${totalQty}`, pageW-20, pageY, { align: 'right' });
  pageY += 6;
  doc.text(`Grand Total: Rs. ${rupees.format(grandTotal)}`, pageW-20, pageY, { align: 'right' });
  pageY += 20;
  doc.text(`Thank you for shopping with us!`, pageW/2, pageY, { align: 'center' });
  const qrimageurl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent("https://re-bill.netlify.app/#"+invoice.invoice.id)}`
  const qrimage = new Image();
  qrimage.crossOrigin = "Anonymous"; 
  qrimage.onload = function() {
    doc.addImage(this, "JPEG", margin, pageY-34, 30, 30);
    doc.save(`Invoice_${invoice.invoice.id}.pdf`);
  };

  qrimage.onerror = function() {
    doc.save(`Invoice_${invoice.invoice.id}.pdf`);
  };
  qrimage.src = qrimageurl
}

updateSearchHistory();

setTimeout( () => {
  if ( location.hash.substring(1) ) {
    searchInvoiceEL.querySelector("input").value = location.hash.substring(1);
    searchInvoiceEL.requestSubmit();
  }
}, 1000);
