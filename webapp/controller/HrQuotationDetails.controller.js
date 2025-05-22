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
          QuotationItemModel: [],
          QuotationNo: "",
          Date: "",
          ValidUntil: "",
          CompanyName: "",
          CompanyMobileNo: "",
          CompanyEmailID: "",
          Country: "",
          CompanyAddress: "",
          CompanyGSTNO: "",
          Percentage: "",
          CustomerName: "",
          CustomerEmailID: "",
          CustomerMobileNo: "",
          CustomerAddress: "",
          CustomerGSTNO: "",
          Notes: ""
        }
        var oModel = new JSONModel(QuotaionModel);
        this.getView().setModel(oModel, "quotation");
        var oQuotationModel = new JSONModel();

        this.getView().setModel(oQuotationModel, "QuotationModel");
        this.getRouter().getRoute("RouteHrQuotationDetails").attachMatched(this._onRouteMatched, this);
      },
      _onRouteMatched: async function (oEvent) {
        var oArgs = oEvent.getParameter("arguments");
        var sQuotationNo = decodeURIComponent(oArgs.sQuotationNo);

        var LoginFunction = await this.commonLoginFunction("HrQuotation");
        if (!LoginFunction) return;

        this.getBusyDialog();

        await this._fetchCommonData("Quotation", "QuotationPDFModel", {});
        await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", {});
        await this._fetchCommonData("Currency", "CurrencyModel");
        await this._fetchCommonData("Country", "CountryModel");
        await this._fetchCommonData("CompanyInvoiceSAC", "SACModel", {});

        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

        var oVisiModel = new JSONModel();

        if (sQuotationNo === "new") {
          var oRawData = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");

          var oToday = new Date();
          oToday.setHours(0, 0, 0, 0); // Normalize

          var oValidUntil = new Date(oToday);
          oValidUntil.setDate(oValidUntil.getDate() + 30);

          var oNormalizedData = {
            CompanyName: oRawData.companyName,
            CompanyAddress: oRawData.longAddress,
            CompanyGSTNO: oRawData.gstin,
            CompanyEmailID: oRawData.carrerEmail,
            Country: "India",
            STDCode: "+91",
            Currency: "INR",
            Date: oToday,
            ValidUntil: oValidUntil
          };

          var oCreateModel = new JSONModel(oNormalizedData);
          this.getView().setModel(oCreateModel, "SingleCompanyModel");

          oVisiModel.setData({ editable: true });

          //  Set min date on Quotation Date
          var oDatePicker = this.getView().byId("HQD_id_Quotation");
          oDatePicker.setMinDate(oToday);
          oDatePicker.setDateValue(oToday); // Ensure UI shows it

          //  Set range on Valid Until Date
          var oValidPicker = this.getView().byId("HQD_id_QuotationValid");
          oValidPicker.setMinDate(oToday);
          oValidPicker.setMaxDate(oValidUntil);
          oValidPicker.setDateValue(oValidUntil); // Ensure UI shows it
        }
        else {
          // Edit Mode
          var aQuotations = this.getView().getModel("QuotationPDFModel").getData();
          var oSelectedQuotation = aQuotations.find(item => item.QuotationNo === sQuotationNo);
          if (oSelectedQuotation) {
            var oSelectedModel = new JSONModel(oSelectedQuotation);
            this.getView().setModel(oSelectedModel, "SingleCompanyModel");
          }

          try {
            const response = await this.ajaxReadWithJQuery("QuotationItem", { QuotationNo: sQuotationNo });
            if (response && response.data) {
              var aItems = Array.isArray(response.data) ? response.data : [response.data];
              var oItemModel = new JSONModel({ QuotationItemModel: aItems });
              this.getView().setModel(oItemModel, "QuotationModel");
              // this._recalculateTotalSum();
              this.updateTotalAmount()
            }
          } catch (e) {
            console.error("Error loading items", e);
          }

          oVisiModel.setData({ editable: false }); // Initially not editable
        }
        if (sQuotationNo === "new") {
          oVisiModel.setData({
            editable: true,
            createVisi: true,
            editVisi: false,
            merge: false
          });
        } else {

          oVisiModel.setData({
            editable: false,
            createVisi: false,
            editVisi: true,
            merge: true
          });
        }

        this.getView().setModel(oVisiModel, "visiablityPlay");
        this.closeBusyDialog();
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
      updateTotalAmount: function () {
        var oView = this.getView();
        var oQuotationModel = oView.getModel("QuotationModel");

        var aItems = oQuotationModel.getProperty("/QuotationItemModel") || [];

        var subTotalTaxable = 0, subTotalNonTaxable = 0;
        var cgst = 0, sgst = 0, igst = 0, totalSum = 0;

        aItems.forEach(function (oItem) {
          var iItemTotal = oItem.Days
            ? parseFloat(oItem.Days) * parseFloat(oItem.UnitPrice || 0)
            : parseFloat(oItem.UnitPrice || 0);

          var iDiscount = 0;
          if (typeof oItem.Discount === "string" && oItem.Discount.endsWith("%")) {
            var percent = parseFloat(oItem.Discount) / 100;
            iDiscount = iItemTotal * percent;
          } else {
            iDiscount = parseFloat(oItem.Discount || 0);
          }

          var finalItemTotal = iItemTotal - iDiscount;
          oItem.Total = parseFloat(finalItemTotal.toFixed(2));

          if (oItem.GSTCalculation === "Yes") {
            subTotalTaxable += oItem.Total;
            oItem.SAC = "998314";
          } else {
            subTotalNonTaxable += oItem.Total;
            oItem.SAC = "-";
          }
        });

        // Update items back into model
        oQuotationModel.setProperty("/QuotationItemModel", aItems);

        // Update Subtotals
        oQuotationModel.setProperty("/SubTotal", parseFloat(subTotalTaxable.toFixed(2)));
        oQuotationModel.setProperty("/SubTotalNotGST", parseFloat(subTotalNonTaxable.toFixed(2)));

        // Tax percentages from model flags
        var cgstPerc = oQuotationModel.getProperty("/CGSTSelected") ? parseFloat(oQuotationModel.getProperty("/Percentage") || 9) : 0;
        var sgstPerc = oQuotationModel.getProperty("/CGSTSelected") ? parseFloat(oQuotationModel.getProperty("/Percentage") || 9) : 0;
        var igstPerc = oQuotationModel.getProperty("/IGSTSelected") ? parseFloat(oQuotationModel.getProperty("/Percentage") || 18) : 0;

        // Reset taxes
        oQuotationModel.setProperty("/CGST", 0);
        oQuotationModel.setProperty("/SGST", 0);
        oQuotationModel.setProperty("/IGST", 0);

        if (oQuotationModel.getProperty("/CGSTSelected")) {
          cgst = subTotalTaxable * (cgstPerc / 100);
          sgst = subTotalTaxable * (sgstPerc / 100);
          oQuotationModel.setProperty("/CGST", parseFloat(cgst.toFixed(2)));
          oQuotationModel.setProperty("/SGST", parseFloat(sgst.toFixed(2)));
          totalSum = subTotalTaxable + subTotalNonTaxable + cgst + sgst;
        } else if (oQuotationModel.getProperty("/IGSTSelected")) {
          igst = subTotalTaxable * (igstPerc / 100);
          oQuotationModel.setProperty("/IGST", parseFloat(igst.toFixed(2)));
          totalSum = subTotalTaxable + subTotalNonTaxable + igst;
        } else {
          totalSum = subTotalTaxable + subTotalNonTaxable;
        }

        oQuotationModel.setProperty("/TotalSum", parseFloat(totalSum.toFixed(2)));

        oQuotationModel.refresh();
      },
      onSelectCGST: function (oEvent) {
        // Uncheck IGST checkbox and ensure only CGST is selected
        this.getView().byId("HQD_id_CheckboxIGS").setSelected(false);

        var oModel = this.getView().getModel("SingleCompanyModel");
        var oQuotationModel = this.getView().getModel("QuotationModel");

        oModel.setProperty("/CGSTSelected", true); // Mark CGST as selected
        oModel.setProperty("/IGSTSelected", false); // Unselect IGST

        // Update visibility for CGST/SGST and hide IGST
        oModel.setProperty("/CGSTVisible", true);
        oModel.setProperty("/SGSTVisible", true);
        oModel.setProperty("/IGSTVisible", false);

        oQuotationModel.setProperty("/CGSTVisible", true);
        oQuotationModel.setProperty("/SGSTVisible", true);
        oQuotationModel.setProperty("/IGSTVisible", false);

        // Set default percentage to 9% for CGST/SGST
        oModel.setProperty("/Percentage", 9);
        oQuotationModel.setProperty("/CGSTSelected", true);

        // Call to update the total amounts with the new selections
        this.updateTotalAmount();

      },

      onSelectIGST: function () {
        // Uncheck CGST/SGST checkboxes and ensure only IGST is selected
        this.getView().byId("HQD_id_CheckboxCGS").setSelected(false);

        var oModel = this.getView().getModel("SingleCompanyModel");
        var oQuotationModel = this.getView().getModel("QuotationModel");

        oModel.setProperty("/CGSTSelected", false); // Unselect CGST
        oModel.setProperty("/IGSTSelected", true); // Mark IGST as selected

        // Update visibility for IGST and hide CGST/SGST
        oModel.setProperty("/CGSTVisible", false);
        oModel.setProperty("/SGSTVisible", false);
        oModel.setProperty("/IGSTVisible", true);

        oQuotationModel.setProperty("/CGSTVisible", false);
        oQuotationModel.setProperty("/SGSTVisible", false);
        oQuotationModel.setProperty("/IGSTVisible", true);

        // Set default percentage to 18% for IGST
        oModel.setProperty("/Percentage", 18);

        // Call to update the total amounts with the new selections
        this.updateTotalAmount();
      },


      HQD_onBack: function () {
        this.getRouter().navTo("RouteHrQuotation");
      },

      HQD_DateValidate: function (oEvent) {
        var oView = this.getView();
        var oDatePicker = oEvent.getSource();
        var oDate = oDatePicker.getDateValue();

        if (oDate) {
          oDate.setHours(0, 0, 0, 0);

          // Prevent past date selection again
          var oToday = new Date();
          oToday.setHours(0, 0, 0, 0);
          if (oDate < oToday) {
            oDatePicker.setValue(""); // Clear invalid input
            return;
          }

          var oMaxDate = new Date(oDate);
          oMaxDate.setDate(oMaxDate.getDate() + 30);

          var oValidUntil = oView.byId("HQD_id_QuotationValid");
          oValidUntil.setMinDate(oDate);
          oValidUntil.setMaxDate(oMaxDate);

          var oCurrentValidUntil = oValidUntil.getDateValue();
          if (!oCurrentValidUntil || oCurrentValidUntil < oDate || oCurrentValidUntil > oMaxDate) {
            oValidUntil.setDateValue(oMaxDate); // Reset to max if invalid
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
          oModel.setProperty("/ShowSACAndGSTCalculation", true);

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
          oModel.setProperty("/ShowSACAndGSTCalculation", false);

          oModel.setProperty("/CGSTSelected", false);
          oModel.setProperty("/IGSTSelected", false);
          oModel.setProperty("/CGSTPercent", "");
          oCGSTPercent.setValue("");
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
          oSingleQuotationModel.setProperty("/Percentage", "");
          oSingleQuotationModel.setProperty("/CGSTSelected", false);
          oSingleQuotationModel.setProperty("/IGSTSelected", false);
          oSingleQuotationModel.setProperty("/CompanyGSTNO", "");
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
        const oCompanyStdCode = this.byId("HQD_id_mobileNumber").getValue();
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
          Notes: oNotes,
          STDCode: oCompanyStdCode,
        };

        // Extract table items
        const oModel = oView.getModel("QuotationModel");
        const aItemArray = oModel.getProperty("/QuotationItemModel") || [];

        const Items = aItemArray.map((item) => ({

          SAC: item.SAC || "",
          Days: item.Days || "",
          UnitPrice: item.UnitPrice || "",
          Total: item.Total || "0.00",
          Currency: item.Currency || oCurrency,
          Description: item.Description || "",
          GSTCalculation: item.GSTCalculation || "Yes",
          Discount: item.Discount || "0.00"
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

      },

      // _recalculateTotalSum: function () {
      //   var oModel = this.getView().getModel("QuotationModel");
      //   var aItems = oModel.getProperty("/QuotationItemModel") || [];

      //   var fTotalSum = aItems.reduce(function (sum, item) {
      //     var total = parseFloat(item.Total);
      //     return sum + (isNaN(total) ? 0 : total);
      //   }, 0);

      //   var oItemModel = this.getView().getModel("QuotationItemModel");
      //   if (!oItemModel) {
      //     oItemModel = new sap.ui.model.json.JSONModel();
      //     this.getView().setModel(oItemModel, "QuotationItemModel");
      //   }

      //   oItemModel.setProperty("/TotalSum", fTotalSum.toFixed(2));
      //   oItemModel.setProperty("/SubTotal", fTotalSum.toFixed(2));
      // },

      HQD_onInputChange: function (oEvent) {
        var oInput = oEvent.getSource();
        var sValue = oInput.getValue().trim();
        var regex = /^[0-9]{1,10}(\.[0-9]{1,2})?$/;

        if (sValue !== "") {
          if (sValue.length > 10 || !regex.test(sValue)) {
            oInput.setValueState("Error");
            oInput.setValueStateText("Value must be up to 10 characters, with a maximum of 2 decimals.");
            this.UnitAmount = false;
          } else {
            oInput.setValueState("None");
            oInput.setValueStateText("");
            this.UnitAmount = true;
          }
        } else {
          oInput.setValueState("None");
          oInput.setValueStateText("");
          this.UnitAmount = true;
        }

        var oBindingContext = oEvent.getSource().getBindingContext("QuotationModel");
        var oItemContext = oBindingContext.getObject();

        var days = parseFloat(oItemContext.Days) || 0;
        var unit = parseFloat(oItemContext.UnitPrice) || 0;
        var discount = parseFloat(oItemContext.Discount) || 0;

        var iTotal = days ? days * unit : unit;
        iTotal = iTotal - discount;

        oBindingContext.getModel().setProperty(oBindingContext.getPath() + "/Total", isNaN(iTotal) ? 0 : parseFloat(iTotal.toFixed(2)));

        this.updateTotalAmount();
      },
      HQD_onchangeDiscount: function (oEvent) {
        var oInput = oEvent.getSource();
        var sRawValue = oEvent.getParameter("value").trim();

        // Allow only digits, dot, and optional %
        sRawValue = sRawValue.replace(/[^0-9.%]/g, "");

        var isPercentage = sRawValue.includes("%");
        var sCleanValue = sRawValue.replace("%", "");

        // Restrict to max 2 decimal places
        var parts = sCleanValue.split(".");
        if (parts.length > 1) {
          parts[1] = parts[1].substring(0, 2);
          sCleanValue = parts.join(".");
        }

        // Restore % if needed
        if (isPercentage) {
          sRawValue = sCleanValue + "%";
        } else {
          sRawValue = sCleanValue;
        }

        // Set cleaned value in input
        oInput.setValue(sRawValue);

        // Validate value
        var regex = /^[0-9]+(\.[0-9]{1,2})?$/;
        if (!sCleanValue || !regex.test(sCleanValue)) {
          oInput.setValueState("Error");
          oInput.setValueStateText(this.i18nModel.getText("discountValueText"));
          this.Discount = false;
          return;
        }

        oInput.setValueState("None");
        oInput.setValueStateText("");
        this.Discount = true;

        // Get binding context and model
        var oContext = oInput.getBindingContext("QuotationModel");
        if (!oContext) return;

        var oModel = oContext.getModel();
        var oItem = oContext.getObject();

        var days = parseFloat(oItem.Days) || 0;
        var unitPrice = parseFloat(oItem.UnitPrice) || 0;
        var discountVal = parseFloat(sCleanValue) || 0;

        var subtotal = days * unitPrice;
        var total = 0;

        if (isPercentage) {
          total = subtotal - (subtotal * discountVal / 100);
        } else {
          total = subtotal - discountVal;
        }

        if (total < 0) total = 0;

        // Set total to model
        oModel.setProperty(oContext.getPath() + "/Total", total.toFixed(2));
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
        this.updateTotalAmount()
      },



      // HQD_onChangeGstNo: function () {

      // },
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
        this.updateTotalAmount();
      },

      onPercentageChange: function (oEvent) {
        var sPercentage = oEvent.getParameter("value"); // Get the new value
        var oModel = this.getView().getModel("SingleCompanyModel");

        // Update the entered percentage in the model
        oModel.setProperty("/Percentage", sPercentage);

        // Recalculate the total with the updated percentage
        this.updateTotalAmount();
      },
      HQD_onPressEdit: async function () {
        const oView = this.getView();
        const oModel = oView.getModel("visiablityPlay");
        const bEditable = oModel.getProperty("/editable");

        if (!bEditable) {
          oModel.setProperty("/editable", true);
        } else {
          // Already in edit mode => perform Save logic
          const oRichTextEditor = this.byId("HQD_id_Notes");
          const oNotesText = oRichTextEditor?._oEditor?.editorManager?.activeEditor?.getContent({ format: 'text' }) || "";

          const oCurrency1 = this.byId("HQD_id_Curency").getSelectedKey();
          const isINR = oCurrency1 === "INR";

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

          const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
          const sQuotationDate = oDateFormat.format(this.byId("HQD_id_Quotation").getDateValue());
          const sValidUntilDate = oDateFormat.format(this.byId("HQD_id_QuotationValid").getDateValue());

          const oSingleModel = oView.getModel("SingleCompanyModel");
          const sQuotationNo = oSingleModel.getProperty("/QuotationNo");
          const sQuotationVersion = oSingleModel.getProperty("/QuotationVersion");

          const data = {
            CompanyName: this.byId("HQD_id_InputCompanyName").getValue(),
            CompanyAddress: this.byId("HQD_id_InputCompanyAddress").getValue(),
            Date: sQuotationDate,
            ValidUntil: sValidUntilDate,
            CompanyGSTNO: this.byId("HQD_id_CompGSTNO").getValue(),
            CompanyMobileNo: this.byId("HQD_id_InputCompanyMobileNo").getValue(),
            CompanyEmailID: this.byId("HQD_id_CompanyEmailID").getValue(),
            CustomerName: this.byId("HQD_id_CustomerName").getValue(),
            CustomerAddress: this.byId("HQD_id_InputCustomerAddress").getValue(),
            CustomerMobileNo: this.byId("HQD_id_InputCustomerMobileNo").getValue(),
            CustomerGSTNO: this.byId("HQD_id_InputCustomerGSTNO").getValue(),
            CustomerEmailID: this.byId("HQD_id_CustomerEmailID").getValue(),
            Currency: this.byId("HQD_id_Curency").getSelectedKey(),
            Percentage: this.byId("HQD_id_Percentage").getValue(),
            Notes: oNotesText,
            CGST: oSingleModel.getProperty("/CGST"),
            SGST: oSingleModel.getProperty("/SGST"),
            IGST: oSingleModel.getProperty("/IGST"),
            SubTotal: oSingleModel.getProperty("/SubTotal"),
            SubTotalNotGST: oSingleModel.getProperty("/SubTotalNotGST"),
            TotalSum: oSingleModel.getProperty("/TotalSum"),
            QuotationVersion: sQuotationVersion
          };

          const filtres = {
            QuotationNo: sQuotationNo
          };

          const aItemArray = oView.getModel("QuotationModel").getProperty("/QuotationItemModel") || [];

          const Items = aItemArray.map((item) => ({
            data: {

              SAC: item.SAC || "",
              Days: item.Days || 0,
              UnitPrice: item.UnitPrice || 0,
              Total: item.Total || "0.00",
              Currency: item.Currency || data.Currency,
              Description: item.Description || "",
              GSTCalculation: item.GSTCalculation || "Yes",
              Discount: item.Discount || "0.00"
            },
            filters: {
              QuotationNo: sQuotationNo,
              SlNo: item.SlNo || ""  // <-- Make sure SlNo is in your model
            }
          }));

          const payload = {
            data,
            filtres,
            Items
          };

          try {
            const response = await this.ajaxUpdateWithJQuery("Quotation", payload);

            this.closeBusyDialog();

            if (response.success === true) {
              MessageToast.show(`Quotation No ${response.QuotationNo} updated successfully!`);
              oModel.setProperty("/editable", false); // Exit edit mode
              this.getRouter().navTo("RouteHrQuotation");
            } else {
              MessageToast.show("Failed to update quotation.");
            }
          } catch (error) {
            this.closeBusyDialog();
            MessageToast.show("Error during update.");
            console.error(error);
          }
        }
      }







    }

    )
  });