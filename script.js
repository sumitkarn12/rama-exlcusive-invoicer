let invoice = null;
const searchHistory = new Set();
const readableDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
const rupees = new Intl.NumberFormat('en-IN');

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
  try { updatePreview(); } catch(e) {}
  setTimeout( () => {
    el.target.querySelector("button").classList.remove("is-loading");
    el.target.querySelectorAll("button,input").forEach( e => {
      e.removeAttribute("disabled");
    });
    previewEL.classList.remove("is-hidden");
    location.hash = invoice_nr;
    searchHistory.add( invoice_nr );
    localStorage.setItem( "HISTORY", JSON.stringify( Array.from( searchHistory ).slice(0,20) ) );
    updateSearchHistory();
  }, 300);
});

window.addEventListener("hashchange", ev => {
  searchInvoiceEL.querySelector("input").value = location.hash.substring(1);
})

function updateSearchHistory() {
  let savedHistory = JSON.parse(localStorage.getItem("HISTORY"));
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

  let editTableHTML = '';
  let previewTableHTML = '';
  let totalQty = 0;
  let grandTotal = 0;

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
}

function generatePDF() {
  const { jsPDF } = window.jspdf;

  let totalQty = 0;
  let grandTotal = 0;
  invoice.items.forEach(i => {
    totalQty += Number(i.qty);
    grandTotal += Number(i.amount);
  });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFillColor(32, 156, 238); // Bulma Link Primary
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(invoice.store.name.toUpperCase(), 14, 18);

    doc.setFontSize(10);
    doc.text("INVOICE", 196, 18, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(211, 211, 211);

    doc.text(`Date: ${readableDate.format(new Date(invoice.items[0].created_at) )}`, 196, 22, { align: 'right' });

    doc.text(invoice.store.address+", "+invoice.store.city, 14, 22);
    doc.setTextColor(60, 60, 60);
    doc.text(`Phone: ${invoice.store.phone}`, 14, 38);
    doc.text(`Email: ${invoice.store.email}`, 14, 44);

    doc.text(`Invoice ID: ${invoice.invoice.id}`, 196, 38, { align: 'right' });
    doc.text(`GSTIN: ${invoice.store.gstin}`, 196, 44, { align: 'right' });

    doc.setDrawColor(220, 220, 220);
    doc.line(14, 50, 196, 50);

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 55, 182, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("BILLED TO CUSTOMER:", 18, 62);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(invoice.invoice.name, 18, 68);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Phone: ${invoice.invoice.phone}    Email: ${invoice.invoice.email || "NA"}`, 18, 73);

    const tableRows = invoice.items.map((item, index) => [
      index + 1,
      item.article == '' ? `Product`: item.article_no,
      item.variant,
      item.qty,
      `Rs. ${rupees.format(item.mrp)}`,
      `Rs. ${rupees.format(item.amount)}`
    ]);

    doc.autoTable({
      startY: 83,
      head: [['#', 'Article', 'Variant', 'Qty', 'MRP', 'Amount']],
      body: tableRows,
      theme: 'striped',
      headStyles: { halign: 'center', fillColor: [32, 156, 238], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(140, finalY, doc.internal.pageSize.getWidth()-140-14, 20, 2, 2, 'F');
    doc.text(`Total Units: ${totalQty}`, doc.internal.pageSize.getWidth()-20, finalY+8, { align: 'right' });
    doc.text(`Grand Total: Rs. ${rupees.format(grandTotal)}`, doc.internal.pageSize.getWidth()-20, finalY+14, { align: 'right' });

    doc.text(`Thank you for shopping with us!`, doc.internal.pageSize.getWidth()/2, finalY+34, { align: 'center' });

    doc.save(`Invoice_${invoice.invoice.id}.pdf`);

}

updateSearchHistory();

if ( location.hash.substring(1) ) {
  searchInvoiceEL.querySelector("input").value = location.hash.substring(1);
  searchInvoiceEL.requestSubmit();
}
