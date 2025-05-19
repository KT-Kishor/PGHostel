sap.ui.define(
  [
    "./BaseController", //import base controller
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/m/MessageToast",
  ],
  function (BaseController, utils, JSONModel, Formatter, MessageToast) {
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
        oQuotationModel.setData({
          Date: this.Formatter.formatDate(new Date()),
          Country: "India",
          STDCode: "+91"
        })
        this.getView().setModel(oQuotationModel, "QuotationModel");
        this.getRouter().getRoute("RouteHrQuotationDetails").attachMatched(this._onRouteMatched, this);
      },
      _onRouteMatched: async function (oEvent) {
        var LoginFunction = await this.commonLoginFunction("HrQuotation");
        if (!LoginFunction) return;
        this.getBusyDialog();
        await this._fetchCommonData("Currency", "CurrencyModel");
        await this._fetchCommonData("Country", "CountryModel");
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

        await this._fetchCommonData("Quotation", "QuotationPDFModel", {});
        await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", {});
        await this._fetchCommonData("CompanyInvoiceSAC", "SACModel", {});

        var oCompanyDetails = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");

        if (oCompanyDetails) {
          var oSingleCompanyModel = new sap.ui.model.json.JSONModel(oCompanyDetails);
          this.getView().setModel(oSingleCompanyModel, "SingleCompanyModel");
        }

        // var sQuotationModel = new JSONModel({
        //   "Percentage": "",
        //   "CGSTVisible": false,
        //   "SGSTVisible": false,
        //   "IGSTVisible": false,

        //   "Date": this._getTodayDate()

        // });
        // this.getView().setModel(sQuotationModel, "QuotationModel");
        this._setValidUntilDateRange();
        this.closeBusyDialog()
      },
      // _getTodayDate: function () {
      //   var oToday = new Date();
      //   var dd = String(oToday.getDate()).padStart(2, '0');
      //   var mm = String(oToday.getMonth() + 1).padStart(2, '0'); // Months are 0-based
      //   var yyyy = oToday.getFullYear();

      //   return dd + '/' + mm + '/' + yyyy;
      // },

      _setValidUntilDateRange: function () {
        var oView = this.getView();
        var oModel = oView.getModel("QuotationModel");

        var sDate = oModel.getProperty("/Date");
        if (sDate) {
          // Parse the date string to Date object
          var oDate = this._parseDate(sDate); // Helper to handle string to Date

          if (oDate) {
            var oMaxDate = new Date(oDate);
            oMaxDate.setDate(oMaxDate.getDate() + 30);

            var oValidUntil = oView.byId("HQD_id_QuotationValid");
            oValidUntil.setMinDate(oDate);
            oValidUntil.setMaxDate(oMaxDate);
          }
        }
      },

      // Helper to parse date 
      _parseDate: function (sDateStr) {
        if (!sDateStr) return null;

        var parts = sDateStr.split("/");
        if (parts.length !== 3) return null;

        var day = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10) - 1;
        var year = parseInt(parts[2], 10);

        return new Date(year, month, day);
      },



      HQD_onCountryChange: function (oEvent) {
        utils._LCstrictValidationComboBox(oEvent, "oEvent");
        if (oEvent.getSource().getValue() === '') {
          oEvent.getSource().setValueState("None")
        }
        var oValue = oEvent.getSource().getSelectedItem().getAdditionalText();

        var oFilter = new sap.ui.model.Filter("CountryCode", sap.ui.model.FilterOperator.EQ, oValue);
        this.byId("HQD_id_STDCode").setValue("");
        this.byId("HQD_id_InputCompanyMobileNo").setValue("");
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
          oModel.setProperty("/CGSTVisible", true);
          oModel.setProperty("/SGSTVisible", true);
          oModel.setProperty("/IGSTVisible", false);
          oModel.setProperty("/Percentage", "");
        }
      },

      onSelectCGST: function (oEvent) {
        var oView = this.getView();
        var oModel = oView.getModel("QuotationModel");

        if (oEvent.getParameter("selected")) {
          oModel.setProperty("/CGSTSelected", true);
          oModel.setProperty("/IGSTSelected", false);

          // Show CGST and SGST
          oModel.setProperty("/CGSTVisible", true);
          oModel.setProperty("/SGSTVisible", true);

          // Hide IGST
          oModel.setProperty("/IGSTVisible", false);

          // Set percentage
          oModel.setProperty("/Percentage", "9");
        } else {
          // Reset all
          oModel.setProperty("/CGSTSelected", false);
          oModel.setProperty("/CGSTVisible", false);
          oModel.setProperty("/SGSTVisible", false);
          oModel.setProperty("/Percentage", "");
        }
      },


      onSelectIGST: function (oEvent) {
        var oView = this.getView();
        var oModel = oView.getModel("QuotationModel");

        if (oEvent.getParameter("selected")) {
          oModel.setProperty("/IGSTSelected", true);
          oModel.setProperty("/CGSTSelected", false);

          // Show IGST
          oModel.setProperty("/IGSTVisible", true);

          // Hide CGST and SGST
          oModel.setProperty("/CGSTVisible", false);
          oModel.setProperty("/SGSTVisible", false);

          // Set percentage
          oModel.setProperty("/Percentage", "18");
        } else {
          // Reset all
          oModel.setProperty("/IGSTSelected", false);
          oModel.setProperty("/IGSTVisible", false);
          oModel.setProperty("/Percentage", "");
        }
      },


      HQD_onBack: function () {
        this.getRouter().navTo("RouteHrQuotation");
      },

      HQD_DateValidate: function (oEvent) {
        // utils._LCvalidateDate(oEvent)

        var oView = this.getView();
        var oDatePicker = oEvent.getSource();
        var oDate = oDatePicker.getDateValue();

        if (oDate) {
          var oMaxDate = new Date(oDate);
          oMaxDate.setDate(oMaxDate.getDate() + 30);

          // Set maxDate 
          var oValidUntil = oView.byId("HQD_id_QuotationValid");
          oValidUntil.setMinDate(oDate);
          oValidUntil.setMaxDate(oMaxDate);    // Set max date +30 days

          // Optional: Reset value if currently selected ValidUntil is invalid
          var oCurrentValidUntil = oValidUntil.getDateValue();
          if (oCurrentValidUntil && (oCurrentValidUntil > oMaxDate || oCurrentValidUntil < oDate)) {
            oValidUntil.setValue(""); // Clear invalid date
          }
        }
      },


      HQD_LastDate: function (oEvent) {
        utils._LCvalidateDate(oEvent)
      },

      HQD_onNameLiveChange: function (oEvent) {
        utils._LCvalidateName(oEvent);
      },

      HQD_onMNumberLiveChange: function (oEvent) {
        utils._LCvalidateMobileNumber(oEvent);
      },

      HQD_EmailIDLiveChange: function (oEvent) {
        utils._LCvalidateEmail(oEvent);

      },

      // HQD_onCountryChange: function (oEvent) {
      //   utils._LCstrictValidationComboBox(oEvent)
      // },

      HQD_onAddressLiveChange: function (oEvent) {
        utils._LCvalidateMandatoryField(oEvent)
      },
      HQD_onComGSTLiveChange: function (oEvent) {
        // Validate GST number (this sets value state internally)
        utils._LCvalidateGstNumber(oEvent);

        var oInput = oEvent.getSource();
        var sValueState = oInput.getValueState(); // "None" = valid, "Error" = invalid
        var sGST = oInput.getValue(); // Get entered GST value

        // Get references to UI elements
        var oView = this.getView();
        var oCGSTRadio = oView.byId("HQD_id_CheckboxCGS");
        var oIGSTRadio = oView.byId("HQD_id_CheckboxIGS");
        var oCGSTPercent = oView.byId("HQD_id_Percentage");

        var oModel = oView.getModel("QuotationModel");

        // If GST is valid (valueState is "None") and not empty
        if (sValueState === "None" && sGST) {
          // Enable fields
          oCGSTRadio.setEditable(true);
          oIGSTRadio.setEditable(true);
          oCGSTPercent.setEditable(true);
          oQuotationModel.setProperty("/ShowSACAndGSTCalculation", true);

          // Show message if no selection made
          var bCGST = oModel.getProperty("/CGSTSelected");
          var bIGST = oModel.getProperty("/IGSTSelected");

          if (!bCGST && !bIGST) {
            MessageToast.show("Please select either CGST/SGST or IGST.");
          }

        } else {
          // Invalid GST or empty => disable fields and clear values
          oCGSTRadio.setEditable(false);
          oIGSTRadio.setEditable(false);
          oCGSTPercent.setEditable(false);
          oQuotationModel.setProperty("/ShowSACAndGSTCalculation", false);

          oModel.setProperty("/CGSTSelected", false);
          oModel.setProperty("/IGSTSelected", false);
          oModel.setProperty("/CGSTPercent", "");
          oCGSTPercent.setValue("")
        }
      },

      HQD_onCurrencyChange: function (oEvent) {
        utils._LCstrictValidationComboBox(oEvent);

        var sSelectedCurrency = oEvent.getSource().getSelectedKey();
        var oQuotationModel = this.getView().getModel("QuotationModel");
        var oSingleQuotationModel = this.getView().getModel("SingleCompanyModel");

        if (sSelectedCurrency === "INR") {
          oQuotationModel.setProperty("/ShowGSTFields", true);
          oQuotationModel.setProperty("/ShowSACAndGSTCalculation", true);
          oSingleQuotationModel.setProperty("/gstEditable", true);
        } else {
          oQuotationModel.setProperty("/ShowGSTFields", false);
          oQuotationModel.setProperty("/ShowSACAndGSTCalculation", false);
          oQuotationModel.setProperty("/Percentage", "");
          oQuotationModel.setProperty("/CGSTSelected", false);
          oQuotationModel.setProperty("/IGSTSelected", false);
          oSingleQuotationModel.setProperty("/gstin", "");
          oSingleQuotationModel.setProperty("/gstEditable", false);
        }
      },

      HQD_onCustomerNameLiveChange: function (oEvent) {
        utils._LCvalidateName(oEvent);
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

      HQD_onCustomerGSTLiveChange: function (oEvent) {
        utils._LCvalidateGstNumber(oEvent)
      },
      HQD_onNotesChange: function (oEvent) {
        utils._LCvalidateMandatoryField(oEvent)
      },

      HQD_onPressSubmit: async function () {
        const oView = this.getView();

        // Validate RichTextEditor content
        const oRichTextEditor = this.byId("HQD_id_Notes");
        const oNotesText = oRichTextEditor?._oEditor?.editorManager?.activeEditor?.getContent({ format: 'text' }) || "";
        const oCurrency1 = this.byId("HQD_id_Curency").getSelectedKey();

        const isINR = oCurrency1 === "INR";
        // Perform other validations
        const bIsValid =
          utils._LCvalidateDate(this.byId("HQD_id_Quotation"), "ID") &&
          utils._LCvalidateDate(this.byId("HQD_id_QuotationValid"), "ID") &&
          utils._LCvalidateName(this.byId("HQD_id_InputCompanyName"), "ID") &&
          utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCompanyName"), "ID") &&
          utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCompanyMobileNo"), "ID") &&
          utils._LCvalidateEmail(this.byId("HQD_id_CompanyEmailID"), "ID") &&
          utils._LCstrictValidationComboBox(this.byId("HQD_id_Country"), "ID") &&
          utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCompanyAddress"), "ID") &&
          (!isINR || utils._LCvalidateGstNumber(this.byId("HQD_id_CompGSTNO"), "ID")) &&
          utils._LCstrictValidationComboBox(this.byId("HQD_id_Curency"), "ID") &&
          utils._LCvalidateMandatoryField(this.byId("HQD_id_CustomerName"), "ID") &&
          utils._LCvalidateEmail(this.byId("HQD_id_CustomerEmailID"), "ID") &&
          utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCustomerMobileNo"), "ID") &&
          utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCustomerAddress"), "ID") &&
          utils._LCvalidateGstNumber(this.byId("HQD_id_InputCustomerGSTNO"), "ID") &&
          (!isINR || utils._LCvalidateMandatoryField(this.byId("HQD_id_Percentage"), "ID"));

        if (!bIsValid) {
          MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          return;
        }
        if (!oNotesText.trim()) {
          MessageToast.show("Notes field is required.");
          return;
        }
        this.getBusyDialog();

        // Format dates
        const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
        const sQuotationDate = oDateFormat.format(this.byId("HQD_id_Quotation").getDateValue());
        const sValidUntilDate = oDateFormat.format(this.byId("HQD_id_QuotationValid").getDateValue());

        // Gather all values
        const oCompanyName = this.byId("HQD_id_InputCompanyName").getValue();
        const omobilenumber = this.byId("HQD_id_InputCompanyMobileNo").getValue();
        const oCompanyEmail = this.byId("HQD_id_CompanyEmailID").getValue();
        const oCountry = this.byId("HQD_id_Country").getSelectedKey();
        const oAddress = this.byId("HQD_id_InputCompanyAddress").getValue();
        const oCompanyGST = this.byId("HQD_id_CompGSTNO").getValue();
        const oPercentage = this.byId("HQD_id_Percentage").getValue();
        const oCurrency = this.byId("HQD_id_Curency").getSelectedKey();
        const oCustomerName = this.byId("HQD_id_CustomerName").getValue();
        const oCustomerEmail = this.byId("HQD_id_CustomerEmailID").getValue();
        const oCustomerMobile = this.byId("HQD_id_InputCustomerMobileNo").getValue();
        const oCustomerAddress = this.byId("HQD_id_InputCustomerAddress").getValue();
        const oCustomerGST = this.byId("HQD_id_InputCustomerGSTNO").getValue();

        const oNotes = oNotesText; // Already extracted

        // Prepare payload
        const data = {
          Date: sQuotationDate,
          ValidUntil: sValidUntilDate,
          CompanyName: oCompanyName,
          CompanyMobileNo: omobilenumber,
          CompanyEmailID: oCompanyEmail,
          Country: oCountry,
          CompanyAddress: oAddress,
          CompanyGSTNO: oCompanyGST,
          Percentage: oPercentage,
          Currency: oCurrency,
          CustomerName: oCustomerName,
          CustomerEmailID: oCustomerEmail,
          CustomerMobileNo: oCustomerMobile,
          CustomerAddress: oCustomerAddress,
          CustomerGSTNO: oCustomerGST,
          Notes: oNotes
        };

        // Extract table items
        const oModel = oView.getModel("QuotationModel");
        const aItemArray = oModel.getProperty("/QuotationItemModel") || [];

        const Items = aItemArray.map((item) => ({
          Item: item.Item || "",
          SAC: item.SAC || "",
          Days: item.Days || "",
          UnitPrice: item.UnitPrice || "",
          Total: item.Total || "0.00",
          Currency: item.Currency || oCurrency,
          Description: item.Description || ""
        }));

        const payload = {
          data,
          Items
        };

        try {
          const response = await this.ajaxCreateWithJQuery("Quotation", payload);

          this.closeBusyDialog();

          if (response.success === true) {
            MessageToast.show(`Quotation No ${response.QuotationNo} Created successfully!`);
            this.resetHQDForm(); // <-- Make sure this resets the RichTextEditor too
            this.getRouter().navTo("RouteHrQuotation");
          } else {
            MessageToast.show("Failed to create quotation.");
          }
        } catch (error) {
          this.closeBusyDialog();
          MessageToast.show("Error during creation.");
          console.error(error);
        }
      },

      HQD_onPressMerge: async function () {

        var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0")
        var sData = this.getView().getModel("quotation").getData();
        var oData = this.getView().getModel("QuotationPDFModel").getProperty("/0")
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
      },

      HQD_onPressAddQuotationItem: function () {
        var oModel = this.getView().getModel("QuotationModel");
        var aItems = oModel.getProperty("/QuotationItemModel") || [];

        var oNewItem = {
          Item: "",
          Description: "",
          SAC: "",
          GSTCalculation: "Yes",
          Days: "",
          UnitPrice: "",
          Discount: "",
          Total: "0.00"
        };

        aItems.push(oNewItem);
        oModel.setProperty("/QuotationItemModel", aItems);



        this._recalculateTotalSum(); // Make sure this updates visibility & totals
      },


      _recalculateTotalSum: function () {
        var oModel = this.getView().getModel("QuotationModel");
        var aItems = oModel.getProperty("/QuotationItemModel") || [];

        var fTotalSum = aItems.reduce(function (sum, item) {
          var total = parseFloat(item.Total);
          return sum + (isNaN(total) ? 0 : total);
        }, 0);

        var oItemModel = this.getView().getModel("QuotationItemModel");
        if (!oItemModel) {
          oItemModel = new sap.ui.model.json.JSONModel();
          this.getView().setModel(oItemModel, "QuotationItemModel");
        }

        oItemModel.setProperty("/TotalSum", fTotalSum.toFixed(2));
        oItemModel.setProperty("/SubTotal", fTotalSum.toFixed(2));
      },



      HQD_onInputChange: function (oEvent) {
        var oModel = this.getView().getModel("QuotationModel");
        var oInput = oEvent.getSource();
        var sPath = oInput.getBindingContext("QuotationModel").getPath();
        var oRow = oModel.getProperty(sPath);

        var iDays = parseFloat(oRow.Days) || 0;
        var fUnitPrice = parseFloat(oRow.UnitPrice) || 0;
        var fDiscount = parseFloat(oRow.Discount) || 0;

        var fTotal = (iDays * fUnitPrice) - fDiscount;
        oRow.Total = fTotal.toFixed(2);

        oModel.setProperty(sPath, oRow);

        this._recalculateTotalSum();
        this.HQD_onPercentageChange()
      },


      HQD_onPressDelete: function (oEvent) {
        //  this.byId("HQD_id_SmartTableQuotationItem").setBusy(true);
        // var that = this;
        // this.showConfirmationDialog(
        //   this.i18nModel.getText("msgBoxConfirm"),
        //   this.i18nModel.getText("commonMesBoxConfirmDelete"),
        //   async function () {
        //     that.byId("HQD_id_SmartTableQuotationItem").setBusy(true);
        //     const QuotationItem = oEvent.getSource().getBindingContext("QuotationModel").getObject().SlNo;
        //     try {
        //       await that.ajaxDeleteWithJQuery("/Quotation", { filters: { SlNo: QuotationItem } });
        //       MessageToast.show(that.i18nModel.getText("expenseDeleteMess")); // <== use 'that' instead of 'this'
        //       that.onChangeEmployeeID();
        //       that.Exp_onSearch();
        //     } catch (error) {
        //       MessageToast.show(error.responseText || "Error deleting Quotation item");
        //     } finally {
        //       that.byId("HQD_id_SmartTableQuotationItem").setBusy(false);
        //     }
        //   },
        //   function () { that.byId("HQD_id_SmartTableQuotationItem").setBusy(false); })

        var oModel = this.getView().getModel("QuotationModel");
        var aItems = oModel.getProperty("/QuotationItemModel");
        var oContext = oEvent.getParameter("listItem").getBindingContext("QuotationModel");
        var iIndex = oContext.getProperty("$index");

        // Remove the item from the array
        aItems.splice(iIndex, 1);

        // Update the model to reflect changes
        oModel.setProperty("/QuotationItemModel", aItems);
      },



      HQD_onChangeGstNo: function () {

      },
      HQD_onPressSendEmail: function () {
        if (!this.oDialogMail) {
          sap.ui.core.Fragment.load({
            name: "sap.kt.com.minihrsolution.fragment.CommonMail",
            controller: this,
          }).then(function (oDialogMail) {
            this.oDialogMail = oDialogMail;
            this.getView().addDependent(this.oDialogMail);
            this.oDialogMail.open();
          }.bind(this));
        } else {
          this.oDialogMail.open();
        }
      },
      resetHQDForm: function () {
        const fields = [
          "HQD_id_QuotationValid", "HQD_id_InputCompanyName", "HQD_id_InputCompanyMobileNo",
          "HQD_id_CompanyEmailID", "HQD_id_Country", "HQD_id_InputCompanyAddress", "HQD_id_CompGSTNO",
          "HQD_id_Percentage", "HQD_id_Curency", "HQD_id_CustomerName", "HQD_id_CustomerEmailID",
          "HQD_id_InputCustomerMobileNo", "HQD_id_InputCustomerAddress", "HQD_id_InputCustomerGSTNO"
        ];

        fields.forEach(id => {
          const oControl = this.byId(id);
          if (oControl?.setValue) oControl.setValue("");
          if (oControl?.setSelectedKey) oControl.setSelectedKey("");
          if (oControl?.setDateValue) oControl.setDateValue(null);
        });

        this.byId("HQD_id_Notes")._oEditor?.editorManager?.activeEditor.setContent("");

        const oModel = this.getView().getModel("QuotationModel");
        oModel.setProperty("/QuotationItemModel", []);
      },
      HQD_onChangeGSTCalculation: function (oEvent) {
        const oComboBox = oEvent.getSource();
        const sGSTValue = oComboBox.getSelectedKey(); // "Yes" or "No"

        const oContext = oComboBox.getBindingContext("QuotationModel");
        const oModel = oContext.getModel();

        // Get SAC model data
        const oSACModel = this.getView().getModel("SACModel");
        const aSACItems = oSACModel.getProperty("/") || [];
        let sSelectedSACId;

        if (sGSTValue === "No") {
          sSelectedSACId = aSACItems[1].sac; // Second item
        } else {
          sSelectedSACId = aSACItems[0].sac; // First item
        }

        // Set SAC id into QuotationModel>SAC
        oModel.setProperty("SAC", sSelectedSACId, oContext);
      },

      HQD_onPercentageChange: function (oEvent) {
        var sValue = oEvent.getParameter("value");
        var oView = this.getView();
        var oModel = oView.getModel("QuotationModel");
        var oItemModel = oView.getModel("QuotationItemModel");

        var fSubTotal = parseFloat(oItemModel.getProperty("/SubTotal")) || 0;
        var fPercentage = parseFloat(sValue);

        if (!isNaN(fPercentage) && fPercentage !== "") {
          oModel.setProperty("/Percentage", fPercentage);

          // Calculate the tax amount
          var fTaxAmount = (fSubTotal * fPercentage) / 100;

          // Reset tax fields
          oItemModel.setProperty("/CGST", 0);
          oItemModel.setProperty("/SGST", 0);
          oItemModel.setProperty("/IGST", 0);

          // Determine which tax type is selected and set values
          var bCGSTSelected = oModel.getProperty("/CGSTSelected");
          var bIGSTSelected = oModel.getProperty("/IGSTSelected");

          if (bCGSTSelected) {
            var halfTax = (fTaxAmount / 2).toFixed(2);
            oItemModel.setProperty("/CGST", halfTax);
            oItemModel.setProperty("/SGST", halfTax);
            oItemModel.setProperty("/CGSTVisible", true);
            oItemModel.setProperty("/SGSTVisible", true);
            oModel.setProperty("/IGSTVisible", false);
          } else if (bIGSTSelected) {
            oItemModel.setProperty("/IGST", fTaxAmount.toFixed(2));
            oItemModel.setProperty("/IGSTVisible", true);
            oItemModel.setProperty("/CGSTVisible", false);
            oItemModel.setProperty("/SGSTVisible", false);
          }

          // Optional: Add total with tax if needed
          var fTotal = fSubTotal + fTaxAmount;
          oItemModel.setProperty("/TotalSum", fTotal.toFixed(2));
        }
      }




    }

    )
  });