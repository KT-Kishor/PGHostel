sap.ui.define(
  [
    "./BaseController", //import base controller
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
  ],
  function (BaseController, utils, JSONModel, Formatter) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.RouteHrQuotationDetails", {
      Formatter: Formatter,
      onInit: function () {
        var QuotaionModel = {


          items: [
            { slNo: "1", item: "Hyundai", description: "skamksmeeeeeee", days: "20", unitPrice: "200.00", discount: "00", total: "4000" },
            { slNo: "2", item: "TATA", description: "Punch", days: "20", unitPrice: "200.00", discount: "00", total: "4000" },
            { slNo: "3", item: "Mahindra", description: "Thar", days: "20", unitPrice: "200.00", discount: "00", total: "4000" },
            { slNo: "4", item: "Hunda", description: "Thar", days: "20", unitPrice: "200.00", discount: "00", total: "4000" }

          ],
          financials: {
            subTotal: "4,000.00",
            tax: "0.00",
            total: "4,000.00",
            amountInWords: "Four Thousand USD Only"
          },

        }
        var oModel = new JSONModel(QuotaionModel);
        this.getView().setModel(oModel, "quotation");
        var oQuotationModel = new JSONModel();
        oQuotationModel.setData({ Date: this.Formatter.formatDate(new Date()),
         Country: "India",
        STDCode: "+91"
        })
        this.getView().setModel(oQuotationModel, "QuotationModel");
        this.getRouter().getRoute("RouteHrQuotationDetails").attachMatched(this._onRouteMatched, this);
      },
      _onRouteMatched: async function (oEvent) {
        await this._fetchCommonData("Currency", "CurrencyModel");
        await this._fetchCommonData("Country", "CountryModel");
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        this._fetchCommonData("Quotation", "QuotationPDFModel", {})

      },

      HQD_onCountryChange: function (oEvent) {
        this.onCountryChange(oEvent, { stdCodeCombo: "HQD_id_STDCode" });
      },

      HQD_onChangeGstNo: function (oEvent) {
        var sGST = oEvent.getSource().getValue().trim();
        var oView = this.getView();
        var oModel = oView.getModel("QuotationModel");

        if (sGST !== "") {
          oModel.setProperty("/GSTValid", true); // make checkboxes & percentage required/editable
        } else {
          oModel.setProperty("/GSTValid", false);
          oModel.setProperty("/CGSTSelected", false);
          oModel.setProperty("/IGSTSelected", false);
          oModel.setProperty("/Percentage", "");
        }
      },

      onSelectCGST: function (oEvent) {
        var oView = this.getView();
        var oModel = oView.getModel("QuotationModel");

        if (oEvent.getParameter("selected")) {
          oModel.setProperty("/CGSTSelected", true);
          oModel.setProperty("/IGSTSelected", false); // uncheck IGST if CGST selected
          oModel.setProperty("/Percentage", "9");
        } else {
          oModel.setProperty("/Percentage", "");
        }
      },

      onSelectIGST: function (oEvent) {
        var oView = this.getView();
        var oModel = oView.getModel("QuotationModel");

        if (oEvent.getParameter("selected")) {
          oModel.setProperty("/IGSTSelected", true);
          oModel.setProperty("/CGSTSelected", false); // uncheck CGST if IGST selected
          oModel.setProperty("/Percentage", "18");
        } else {
          oModel.setProperty("/Percentage", "");
        }
      },

      HQD_onBack: function () {
        this.getRouter().navTo("RouteHrQuotation");
      },

      HQD_DateValidate: function (oEvent) {
        utils._LCvalidateDate(oEvent)
      },

      HQD_LastDate: function (oEvent) {
        utils._LCvalidateDate(oEvent)
      },

      HQD_onNameLiveChange: function (oEvent) {
        utils._LCvalidateMandatoryField(oEvent)
      },

      HQD_onMNumberLiveChange: function (oEvent) {
        utils._LCvalidateMobileNumber(oEvent);
      },

      HQD_EmailIDLiveChange: function (oEvent) {
        utils._LCvalidateEmail(oEvent)
      },

      HQD_onCountryChange: function (oEvent) {
        utils._LCstrictValidationComboBox(oEvent)
      },

      HQD_onAddressLiveChange: function (oEvent) {
        utils._LCvalidateMandatoryField(oEvent)
      },
      HQD_onComGSTLiveChange: function (oEvent) {
        utils._LCvalidateGstNumber(oEvent)
        // Validate GST logic
        var oModel = this.getView().getModel("QuotationModel");
        var sGST = oModel.getProperty("/CompanyGSTNO");

        if (sGST) {
          var bCGST = oModel.getProperty("/CGSTSelected");
          var bIGST = oModel.getProperty("/IGSTSelected");

          if (!bCGST && !bIGST) {
            MessageToast.show("Please select either CGST/SGST or IGST.");
            return;
          }
        }

      },

      HQD_onCurrencyChange: function (oEvent) {
        utils._LCstrictValidationComboBox(oEvent)
      },

      HQD_onCustomerNameLiveChange: function (oEvent) {
        utils._LCvalidateMandatoryField(oEvent)
      },

      HQD_EmailIDLiveChange: function (oEvent) {
        utils._LCvalidateEmail(oEvent)
      },

      HQD_onMNumberLiveChange: function (oEvent) {
        utils._LCvalidateMobileNumber(oEvent);
      },

      HQD_onAddressLiveChange: function (oEvent) {
        utils._LCvalidateMandatoryField(oEvent)
      },

      HQD_onCustomerGSTLiveChange:function(oEvent){
        utils._LCvalidateGstNumber(oEvent)
      },

      HQD_onPressSubmit: function () {
        try {
          if (
            utils._LCvalidateDate(this.byId("HQD_id_Quotation"), "ID") &&
            utils._LCvalidateDate(this.byId("HQD_id_QuotationValid"), "ID") &&
            utils._LCvalidateName(this.byId("HQD_id_InputCompanyName"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCompanyName"), "ID") &&
            utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCompanyMobileNo"), "ID") &&
            utils._LCvalidateEmail(this.byId("HQD_id_CompanyEmailID"), "ID") &&
            utils._LCstrictValidationComboBox(this.byId("HQD_id_Country"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCompanyAddress"), "ID") &&
            utils._LCvalidateGstNumber(this.byId("HQD_id_CompGSTNO"), "ID") &&
            utils._LCstrictValidationComboBox(this.byId("HQD_id_Curency"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("HQD_id_CustomerName"), "ID") &&
            utils._LCvalidateEmail(this.byId("HQD_id_CustomerEmailID"), "ID") &&
            utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCustomerMobileNo"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCustomerAddress"), "ID") &&
            utils._LCvalidateGstNumber(this.byId("HQD_id_InputCustomerGSTNO"), "ID")) {
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          }
        } catch (error) {
          MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
        }
      },
      HQD_onPressMerge: async function () {
        // var oView = this.getView();
        // var oData = oView.getModel("quotation").getData();

        await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", {});
        var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0")
        var sData = this.getView().getModel("quotation").getData();
        var oData = this.getView().getModel("QuotationPDFModel").getProperty("/1")
        var { jsPDF } = window.jspdf;
        var doc = new jsPDF({
          unit: "mm",
          format: "a4",
          margins: { left: 20, right: 20 },
          lineHeight: 1,
          orientation: "portrait",
        });
        var imgblob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
        var img = await this._convertBLOBToImage(imgblob);
        doc.setFontSize(30);
        doc.setFont("Time-Italic", "bold");
        doc.text(this.i18nModel.getText("quotation"), 135, 40);
        doc.addImage(img, "PNG", 13, 20, 50, 50);

        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(oData.CompanyName, 13, 80);
        doc.setFont("helvetica", "normal");

        doc.text(oData.CompanyAddress, 13, 85, { maxWidth: 60 });
        doc.text(this.i18nModel.getText("pdfmobile") + oData.CompanyMobileNo, 13, 105);
        doc.text(this.i18nModel.getText("pdfemail") + oData.CompanyEmailID, 13, 110);

        doc.setFont("helvetica", "bold");
        doc.text(this.i18nModel.getText("pdfquotationNo"), 168, 80, { align: "right" });
        doc.text(this.i18nModel.getText("pdfDate"), 168, 85, { align: "right" });
        doc.text(this.i18nModel.getText("pdfValiduntil"), 168, 90, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.text(oData.QuotationNo, 172, 80);
        doc.text(Formatter.formatDate(oData.Date), 172, 85);
        doc.text(Formatter.formatDate(oData.ValidUntil), 172, 90);

        doc.setFont("helvetica", "bold");
        doc.text(this.i18nModel.getText("pdfto"), 13, 120,);
        doc.text(oData.CustomerName, 13, 125);
        doc.setFont("helvetica", "normal");
        doc.text(oData.CustomerAddress, 13, 130);
        doc.text(this.i18nModel.getText("pdfmobile") + oData.CustomerMobileNo, 13, 135);
        doc.text(this.i18nModel.getText("pdfemail") + oData.CustomerEmailID, 13, 140);

        // AutoTable Section
        var body = sData.items.map(item => [
          item.slNo, item.item, item.description, item.days, item.unitPrice, item.discount, item.total
        ]);
        doc.autoTable({
          startY: 150,
          head: [['Sl.No.', 'Item', 'Description', 'Days', 'Unit Price', 'Discount', 'Total']],
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: {
            font: "helvetica",
            fontSize: 11,
            cellPadding: 3
          }
        });

        let finalY = doc.lastAutoTable.finalY || 150;

        // Estimate how much space we need for the bottom section
        const remainingContentHeight = 50;

        // Check if we need a new page
        if (finalY + remainingContentHeight > doc.internal.pageSize.getHeight()) {
          doc.addPage();
          finalY = 20; // Reset Y for the new page
        }

        // Subtotal, Tax
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");

        var subTotalText = this.i18nModel.getText("pdfsubtotal") + " (" + oData.Currency + ")" + ": " + Formatter.fromatNumber(oData.SubTotal);
        doc.text(subTotalText, 190, finalY + 10, { align: "right" });

        doc.text(this.i18nModel.getText("pdftax") + " (" + oData.Percentage + "%)" + ": " + sData.financials.tax, 181, finalY + 18, { align: "right" });

        // Conditionally show CGST and SGST only if currency is not USD
        let slineY = finalY + 20;
        if (oData.Currency !== "USD") {
          doc.text("CGST" + " (" + oData.Percentage + "%)" + ": " + sData.financials.tax, 181, slineY + 5, { align: "right" });
          doc.text("SGST" + " (" + oData.Percentage + "%)" + ": " + sData.financials.tax, 181, slineY + 13, { align: "right" });
          slineY += 18; // Adjust spacing for total line below
        }


        // Line + Total
        let lineY = finalY + 35;
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(105, lineY, 196, lineY);
        doc.setFont("helvetica", "bold");
        doc.text(this.i18nModel.getText("pdfTotal") + " (" + oData.Currency + ")" + ":" + Formatter.fromatNumber(oData.TotalSum), 190, lineY + 7, { align: "right" });

        // Amount in Words
        let amountY = lineY + 20;
        doc.setFont("helvetica", "bold");
        doc.text(this.i18nModel.getText("pdfaAmount"), 13, amountY);
        doc.setFont("helvetica", "normal");
        doc.text(sData.financials.amountInWords, 13, amountY + 5, { maxWidth: 180 });

        // Terms & Conditions
        let termsY = amountY + 15;
        doc.setFont("helvetica", "bold");
        doc.text(this.i18nModel.getText("pdftermconditaion"), 13, termsY);
        doc.setFont("helvetica", "normal");
        doc.text(oData.Notes, 13, termsY + 5, { maxWidth: 180 });

        doc.save("Quotation.pdf");
      }
    }

    )
  });