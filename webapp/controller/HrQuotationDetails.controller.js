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
          // QuotationItemModel: [],
          // QuotationNo: "",
          // Date: "",
          // ValidUntil: "",
          // CompanyName: "",
          // CompanyMobileNo: "",
          // CompanyEmailID: "",
          // Country: "",
          // CompanyAddress: "",
          // CompanyGSTNO: "",
          // Percentage: "",
          // CustomerName: "",
          // CustomerEmailID: "",
          // CustomerMobileNo: "",
          // CustomerAddress: "",
          // CustomerGSTNO: "",
          // Notes: ""
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

            Date: oToday,
            ValidUntil: oValidUntil
          };

          var oCreateModel = new JSONModel(oNormalizedData);
          this.getView().setModel(oCreateModel, "SingleCompanyModel");

          oVisiModel.setData({ editable: true });

          //  Set min date on Quotation Date
          var oDatePicker = this.getView().byId("HQD_id_Quotation");
          oDatePicker.setDateValue(oToday); // Ensure UI shows it

          //  Set range on Valid Until Date
          var oValidPicker = this.getView().byId("HQD_id_QuotationValid");
          oValidPicker.setMaxDate(oValidUntil);
          oValidPicker.setDateValue(oValidUntil); // Ensure UI shows it
        }
        else {
          // Edit Mode
          this._fetchCommonData("EmailContent", "CCMailModel", { Type: "Quotation" });
          var aQuotations = this.getView().getModel("QuotationPDFModel").getData();
          var oSelectedQuotation = aQuotations.find(item => item.QuotationNo === sQuotationNo);
          if (oSelectedQuotation) {
            var oSelectedModel = new JSONModel(oSelectedQuotation);
            this.getView().setModel(oSelectedModel, "SingleCompanyModel");

            // Ensure specific fields remain editable in edit mode
            oSelectedModel.setProperty("/gstEditable", true);
            oSelectedModel.setProperty("/gstEditable", false);
          }

          try {
            const response = await this.ajaxReadWithJQuery("QuotationItem", { QuotationNo: sQuotationNo });
            if (response && response.data) {
              var aItems = Array.isArray(response.data) ? response.data : [response.data];
              var oItemModel = new JSONModel({ QuotationItemModel: aItems });
              this.getView().setModel(oItemModel, "QuotationModel");
              this.updateTotalAmount();
            }
          } catch (e) {
            console.error("Error loading items", e);
          }

          oVisiModel.setData({ editable: false });
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
        var oComboBox = oEvent.getSource();
        var sSelectedKey = oComboBox.getSelectedKey();
        var oQuotationModel = this.getView().getModel("QuotationModel");
        // Get view elements
        var oSTDCodeField = this.byId("HQD_id_mobileNumber");
        var oMobileNumberField = this.byId("HQD_id_InputCompanyMobileNo");
        var oCurency = this.byId("HQD_id_Curency");

        if (sSelectedKey === "India") {
          oSTDCodeField.setValue("+91");
          oCurency.setSelectedKey("INR");
          oQuotationModel.setProperty("/ShowGSTFields", true);
        } else {
          oSTDCodeField.setValue("");
          oMobileNumberField.setValue("");
        }

        // Reset value state if no value
        if (oComboBox.getValue() === '') {
          oComboBox.setValueState("None");
        }
      },


      HQD_onChangeGstNo: function (oEvent) {
        // var sGST = oEvent.getSource().getValue().trim();
        // var oView = this.getView();
        // var oModel = oView.getModel("QuotationModel");

        // if (sGST !== "") {
        //   oModel.setProperty("/GSTValid", true); // make checkboxes & percentage required/editable
        // } else {
        //   oModel.setProperty("/GSTValid", false);
        //   oModel.setProperty("/CGSTSelected", false);
        //   oModel.setProperty("/IGSTSelected", false);
        //   oModel.setProperty("/CGSTVisible", true);
        //   oModel.setProperty("/SGSTVisible", true);
        //   oModel.setProperty("/IGSTVisible", false);
        //   oModel.setProperty("/Percentage", "");
        // }
      },
      HQD_onComGSTLiveChange: function (oEvent) {
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

            // Only set SAC if not already set (or it's empty/undefined)
            if (!oItem.SAC) {
              oItem.SAC = "998314";
            }
          } else {
            subTotalNonTaxable += oItem.Total;

            // Only clear SAC if explicitly needed
            if (!oItem.SAC || oItem.SAC === "998314") {
              oItem.SAC = "-";
            }
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
        var oView = this.getView();

        // Uncheck CGST/SGST checkboxes
        oView.byId("HQD_id_CheckboxCGS").setSelected(false);

        // Access both models
        var oCompanyModel = oView.getModel("SingleCompanyModel");
        var oQuotationModel = oView.getModel("QuotationModel");

        // Update flags in QuotationModel instead of SingleCompanyModel
        oQuotationModel.setProperty("/CGSTSelected", false);
        oQuotationModel.setProperty("/IGSTSelected", true);

        // Update visibility
        oQuotationModel.setProperty("/CGSTVisible", false);
        oQuotationModel.setProperty("/SGSTVisible", false);
        oQuotationModel.setProperty("/IGSTVisible", true);

        // Set percentage for IGST in QuotationModel
        oQuotationModel.setProperty("/Percentage", 18);
        oCompanyModel.setProperty("/Percentage", 18);

        // Recalculate
        this.updateTotalAmount();
      },


      HQD_onBack: function () {
        this.getRouter().navTo("RouteHrQuotation");
        this.resetHQDForm()
      },

      HQD_DateValidate: function (oEvent) {
        var oView = this.getView();
        var oDatePicker = oEvent.getSource();
        var oDate = oDatePicker.getDateValue();

        if (oDate) {
          oDate.setHours(0, 0, 0, 0);

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


      HQD_onCurrencyChange: function (oEvent) {
        utils._LCstrictValidationComboBox(oEvent);

        var sSelectedCurrency = oEvent.getSource().getSelectedKey();

        var oQuotationModel = this.getView().getModel("QuotationModel");
        var oSingleCompanyModel = this.getView().getModel("SingleCompanyModel");

        // GST-relevant fields and values
        var oView = this.getView();
        var oModelDataPro = this.getView().getModel("QuotationModel");

        var fTotal = parseFloat(oModelDataPro.getProperty("/TotalSum")) || 0;
        var fCGST = parseFloat(oModelDataPro.getProperty("/CGST")) || 0;
        var fSGST = parseFloat(oModelDataPro.getProperty("/SGST")) || 0;
        var fIGST = parseFloat(oModelDataPro.getProperty("/IGST")) || 0;

        if (sSelectedCurrency === "INR") {
          // Currency is INR — enable GST
          oQuotationModel.setProperty("/CGSTVisible", false);
          oQuotationModel.setProperty("/SGSTVisible", false);
          oQuotationModel.setProperty("/IGSTVisible", false);
          oQuotationModel.setProperty("/ShowGSTFields", true);

          oSingleCompanyModel.setProperty("/gstEditable", true);
          oView.byId("HQD_id_CompGSTNO")?.setEnabled(true);
          // GST-related logic (optional if not already in another function)
          // Calculate Total with GST
          var fNewTotal = fTotal + fCGST + fSGST + fIGST;
          oModelDataPro.setProperty("/TotalSum", fNewTotal.toFixed(2));
        } else {
          // Currency is NOT INR — disable GST

          oQuotationModel.setProperty("/CGSTVisible", false);
          oQuotationModel.setProperty("/SGSTVisible", false);
          oQuotationModel.setProperty("/IGSTVisible", false);
          oQuotationModel.setProperty("/ShowGSTFields", false);

          oSingleCompanyModel.setProperty("/Percentage", "");
          oSingleCompanyModel.setProperty("/CGSTSelected", false);
          oSingleCompanyModel.setProperty("/IGSTSelected", false);
          oSingleCompanyModel.setProperty("/CompanyGSTNO", "");
          oSingleCompanyModel.setProperty("/gstEditable", false);
          oView.byId("HQD_id_CompGSTNO")?.setEnabled(false);

          // Recalculate Total without GST
          var updatedTotal = fTotal - (fCGST + fSGST + fIGST);
          oModelDataPro.setProperty("/SubTotalNotGST", updatedTotal.toFixed(2));
          oModelDataPro.setProperty("/TotalSum", updatedTotal.toFixed(2));
          oModelDataPro.setProperty("/SubTotal", "");

          // Clear GST values
          oModelDataPro.setProperty("/CGST", "0");
          oModelDataPro.setProperty("/SGST", "0");
          oModelDataPro.setProperty("/IGST", "0");
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
        oView.getModel("QuotationModel").getData()
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



        // Get values from QuotationModel
        const oQuotationModel = oView.getModel("QuotationModel");
        const oQuotationData = oQuotationModel.getData();

        const fTotalSum = parseFloat(oQuotationData.TotalSum || "0");
        if (isNaN(fTotalSum) || fTotalSum <= 0) {
          MessageToast.show("Total amount must be greater than 0.");
          return;
        }

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

          SubTotalNotGST: oQuotationData.SubTotalNotGST || "0.00",
          SubTotal: oQuotationData.SubTotal || "0.00",
          CGST: oQuotationData.CGST || "0.00",
          SGST: oQuotationData.SGST || "0.00",
          IGST: oQuotationData.IGST || "0.00",
          TotalSum: oQuotationData.TotalSum || "0.00"
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
        this.getBusyDialog();
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
      //for converting number to words
      numberToWords: function (num) {
        const a = [
          "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
          "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
          "Eighteen", "Nineteen"
        ];
        const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

        function inWords(n) {
          if (n < 20) return a[n];
          if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
          if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + inWords(n % 100) : "");
          if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
          if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
          return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
        }

        if (!num || isNaN(num)) return "Zero";
        return inWords(Math.floor(num)) + " Only";
      },

      HQD_onPressMerge: async function () {
        // this.numberToWords()
        const oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
        const oData = this.getView().getModel("SingleCompanyModel").getData(); // Selected Quotation
        const oQuotaionItem = this.getView().getModel("QuotationModel").getData();
        const aItems = this.getView().getModel("QuotationModel")?.getProperty("/QuotationItemModel") || [];

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
          unit: "mm",
          format: "a4",
          margins: { left: 20, right: 20 },
          lineHeight: 1,
          orientation: "portrait",
        });

        const imgblob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
        const img = await this._convertBLOBToImage(imgblob);

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
        doc.text(this.i18nModel.getText("pdfto"), 13, 120);
        doc.text(oData.CustomerName, 13, 125);
        doc.setFont("helvetica", "normal");
        doc.text(oData.CustomerAddress, 13, 130);
        doc.text(this.i18nModel.getText("pdfmobile") + oData.CustomerMobileNo, 13, 135);
        doc.text(this.i18nModel.getText("pdfemail") + oData.CustomerEmailID, 13, 140);

        // AutoTable Section
        const body = aItems.map((item, index) => [
          index + 1,
          item.Description,
          item.Days,
          item.UnitPrice,
          item.Discount,
          item.Total
        ]);

        doc.autoTable({
          startY: 150,
          head: [['Sl.No.', 'Description', 'Days', 'Unit Price', 'Discount', 'Total']],
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
        const remainingContentHeight = 50;
        if (finalY + remainingContentHeight > doc.internal.pageSize.getHeight()) {
          doc.addPage();
          finalY = 20;
        }

        // Subtotal, Tax, Total
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");

        doc.text(`${this.i18nModel.getText("pdfsubtotal")} (${oData.Currency}): ${Formatter.fromatNumber(oData.SubTotal)}`, 190, finalY + 10, { align: "right" });
        // doc.text(`${this.i18nModel.getText("pdftax")} (${oData.Percentage}%): ${Formatter.fromatNumber(oData.)}`, 190, finalY + 18, { align: "right" });

        let slineY = finalY + 20;
        if (oData.Currency !== "USD") {
          const cgst = Formatter.fromatNumber((oQuotaionItem.CGST).toFixed(2));
          const sgst = Formatter.fromatNumber((oQuotaionItem.SGST).toFixed(2));
          doc.text(`CGST (${oQuotaionItem.Percentage}%): ${cgst}`, 190, slineY + 5, { align: "right" });
          doc.text(`SGST (${oQuotaionItem.Percentage}%): ${sgst}`, 190, slineY + 13, { align: "right" });
          slineY += 18;
        }
        const lineY = finalY + 35;
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(105, lineY, 196, lineY);
        doc.setFont("helvetica", "bold");
        doc.text(`${this.i18nModel.getText("pdfTotal")} (${oData.Currency}): ${Formatter.fromatNumber(oData.TotalSum)}`, 190, lineY + 7, { align: "right" });
        oData.AmountInWords = this.numberToWords(oData.TotalSum);
        // Amount in Words (optional)
        const amountY = lineY + 20;
        doc.text(this.i18nModel.getText("pdfaAmount"), 13, amountY);
        doc.setFont("helvetica", "normal");
        doc.text(oData.AmountInWords || "", 13, amountY + 5, { maxWidth: 180 });

        // Terms & Conditions
        const termsY = amountY + 15;
        doc.setFont("helvetica", "bold");
        doc.text(this.i18nModel.getText("pdftermconditaion"), 13, termsY);
        doc.setFont("helvetica", "normal");
        doc.text(oData.Notes || "", 13, termsY + 5, { maxWidth: 180 });

        doc.save("Quotation.pdf");
      },


      HQD_onPressAddQuotationItem: function () {
        var oModel = this.getView().getModel("QuotationModel");
        var oVisibilityModel = this.getView().getModel("visiablityPlay");
        var aItems = oModel.getProperty("/QuotationItemModel") || [];

        var bEditMode = oVisibilityModel.getProperty("/editable");

        var oNewItem = {
          Description: "",
          SAC: "",
          GSTCalculation: "Yes",
          Days: "",
          UnitPrice: "",
          Discount: "",
          Total: "0.00"
        };

        // If in edit mode, add flag
        if (bEditMode) {
          oNewItem.flag = "create";
        }

        aItems.push(oNewItem);
        oModel.setProperty("/QuotationItemModel", aItems);
      },


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
        var sUserInput = oEvent.getParameter("value").trim();

        // Check if input includes %
        var isPercentage = sUserInput.includes("%");

        // Remove % symbol and non-numeric chars except dot
        var sCleanValue = sUserInput.replace(/[^0-9.]/g, "");

        // Limit to 2 decimal places
        var parts = sCleanValue.split(".");
        if (parts.length > 1) {
          parts[1] = parts[1].substring(0, 2);
          sCleanValue = parts.join(".");
        }

        // Update input value with cleaned number (no % shown)
        oInput.setValue(sCleanValue);

        // Validate cleaned input
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

        // Get QuotationModel context
        var oContext = oInput.getBindingContext("QuotationModel");
        if (!oContext) return;

        var oModel = oContext.getModel();
        var oItem = oContext.getObject();

        var days = parseFloat(oItem.Days) || 0;
        var unitPrice = parseFloat(oItem.UnitPrice) || 0;
        var discountVal = parseFloat(sCleanValue) || 0;

        // Calculate subtotal and discount
        var subtotal = days * unitPrice;
        var discountAmount = isPercentage ? (subtotal * discountVal / 100) : discountVal;

        if (discountAmount > subtotal) discountAmount = subtotal;

        var total = subtotal - discountAmount;

        // Update model with new total
        oModel.setProperty(oContext.getPath() + "/Total", total.toFixed(2));

        // Update all totals
        this.updateTotalAmount();
      },


      HQD_onPressDelete: async function (oEvent) {
        // this.byId("HQD_id_SmartTableQuotationItem").getBusyDialog();
        // this.getBusyDialog();
        const that = this;

        try {
          const oListItem = oEvent.getParameter("listItem");
          const oContext = oListItem.getBindingContext("QuotationModel");

          if (!oContext) throw new Error("Binding context not found for selected row.");

          const oItemData = oContext.getObject();
          const sPath = oContext.getPath();

          const confirmed = await new Promise((resolve) => {
            that.showConfirmationDialog(
              that.i18nModel.getText("msgBoxConfirm"),
              that.i18nModel.getText("msgBoxConfirmDelete"),
              () => resolve(true),
              () => resolve(false)
            );
          });

          if (!confirmed) {
            this.closeBusyDialog();
            return;
          }

          const oModel = that.getView().getModel("QuotationModel");
          const aItems = oModel.getProperty("/QuotationItemModel");

          // Determine if item is from DB (Edit mode) or newly added in UI (Create mode)
          const isEditMode = oItemData && oItemData.SlNo;

          if (isEditMode) {
            const sQuotationNo = that.getView().getModel("SingleCompanyModel").getProperty("/QuotationNo");
            if (!sQuotationNo) {
              throw new Error("Quotation number is missing.");
            }
            this.getBusyDialog();
            await that.ajaxDeleteWithJQuery("/QuotationItem", {
              filters: {
                QuotationNo: sQuotationNo,
                SlNo: oItemData.SlNo
              }
            });
            this.closeBusyDialog();
            MessageToast.show(that.i18nModel.getText("msgQuotationitemdelete"));
          }

          // Remove from local model array (works for both Create and Edit mode)
          const iIndex = parseInt(sPath.split("/").pop(), 10);
          aItems.splice(iIndex, 1);
          oModel.setProperty("/QuotationItemModel", aItems);

          that.updateTotalAmount();
        } catch (error) {
          MessageToast.show(error.message || "Error deleting Quotation item");
        } finally {
          this.closeBusyDialog();
        }
      },

      EOD_commonOpenDialog: function (fragmentName) {
        if (!this.EOU_oDialogMail) {
          sap.ui.core.Fragment.load({
            name: fragmentName,
            controller: this,
          }).then(function (EOU_oDialogMail) {
            this.EOU_oDialogMail = EOU_oDialogMail;
            this.getView().addDependent(this.EOU_oDialogMail);
            this.EOU_oDialogMail.open();
          }.bind(this));
        } else {
          this.EOU_oDialogMail.open();
        }
      },
      HQD_onPressSendEmail: function () {
        var oEmployeeEmail = this.getView().getModel("SingleCompanyModel").getData().CustomerEmailID;
        if (!oEmployeeEmail || oEmployeeEmail.length === 0) {
          MessageBox.error("To Email is missing");
          return;
        }
        var oUploaderDataModel = new JSONModel({
          isEmailValid: true,
          ToEmail: oEmployeeEmail,
          CCEmail: this.getView().getModel("CCMailModel").getData()[0].CCEmailId,
          name: "",
          mimeType: "",
          content: "",
          isFileUploaded: false,
          button: false
        });
        this.getView().setModel(oUploaderDataModel, "UploaderData");
        this.EOD_commonOpenDialog("sap.kt.com.minihrsolution.fragment.CommonMail");
        this.validateSendButton();
      },
      Mail_onPressClose: function () {
        this.EOU_oDialogMail.destroy();
        this.EOU_oDialogMail = null;
      },
      Mail_onUpload: function (oEvent) {
        this.handleFileUpload(
          oEvent,
          this,                      // context
          "UploaderData",            // model name
          "/attachments",            // path to attachment array
          "/name",                   // path to comma-separated file names
          "/isFileUploaded",         // boolean flag path
          "uploadSuccessfull",       // i18n success key
          "fileAlreadyUploaded",     // i18n duplicate key
          "noFileSelected",          // i18n no file selected
          "fileReadError",           // i18n file read error
          () => this.validateSendButton()
        );
      },
      Mail_onEmailChange: function () {
        this.validateSendButton();
      },
      validateSendButton: function () {
        try {
          const sendBtn = sap.ui.getCore().byId("SendMail_Button");
          const emailField = sap.ui.getCore().byId("CCMail_TextArea");
          const uploaderModel = this.getView().getModel("UploaderData");
          if (!sendBtn || !emailField || !uploaderModel) {
            return;
          }
          const isEmailValid = utils._LCvalidateEmail(emailField, "ID") === true;
          const isFileUploaded = uploaderModel.getProperty("/isFileUploaded") === true;
          sendBtn.setEnabled(isEmailValid && isFileUploaded);
        } catch (error) {
          MessageToast.show(this.i18nModel.getText("technicalError"));
        }
      },
      Mail_onSendEmail: function () {
        try {
          var oModel = this.getView().getModel("SingleCompanyModel").getData();

          // Format date to DD/MM/YYYY
          var oDate = new Date(oModel.Date); // Ensure it's a Date object
          var sFormattedDate = [
            ("0" + oDate.getDate()).slice(-2),
            ("0" + (oDate.getMonth() + 1)).slice(-2),
            oDate.getFullYear()
          ].join("/");

          var oPayload = {
            "CustomerName": oModel.CustomerName,
            "CustomerEmailID": oModel.CustomerEmailID,
            "QuotationNo": oModel.QuotationNo,
            "Date": sFormattedDate,
            "TotalSum": (`${oModel.TotalSum} ${oModel.Currency}`),
            "CC": sap.ui.getCore().byId("CCMail_TextArea").getValue(),
            "attachments": this.getView().getModel("UploaderData").getProperty("/attachments")
          };

          this.getBusyDialog();
          this.ajaxCreateWithJQuery("QuotationSendEmail", oPayload).then((oData) => {
            MessageToast.show(this.i18nModel.getText("emailSuccess"));
            this.closeBusyDialog();
          }).catch((error) => {
            this.closeBusyDialog();
            MessageToast.show(error.responseText);
          });
          this.Mail_onPressClose();
        } catch (error) {
          this.closeBusyDialog();
          MessageToast.show(error.responseText);
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
        // Clear rich text editor
        this.byId("HQD_id_Notes")._oEditor?.editorManager?.activeEditor.setContent("");

        const oModel = this.getView().getModel("QuotationModel");

        //Clear calculation-related fields
        oModel.setProperty("/QuotationItemModel", []); oModel.setProperty("/SubTotal", ""); oModel.setProperty("/SubTotalNotGST", ""); oModel.setProperty("/CGST", ""); oModel.setProperty("/SGST", ""); oModel.setProperty("/IGST", ""); oModel.setProperty("/TotalSum", ""); oModel.setProperty("/CGSTVisible", false); oModel.setProperty("/SGSTVisible", false); oModel.setProperty("/IGSTVisible", false);
        // Also reset relevant fields in SingleCompanyModel
        const oSingleModel = this.getView().getModel("SingleCompanyModel");
        oSingleModel.setProperty("/Percentage", "");
        oSingleModel.setProperty("/Currency", "");
      },

      HQD_onChangeGSTCalculation: function (oEvent) {
        var oSource = oEvent.getSource(); // The ComboBox that was changed
        var sSelectedKey = oSource.getSelectedKey(); // "Yes" or "No"
        var oContext = oSource.getBindingContext("QuotationModel"); // Get row context

        if (!oContext) return;

        var sPath = oContext.getPath(); // e.g., /QuotationItemModel/0
        var oModel = oContext.getModel();

        oModel.setProperty(sPath + "/GSTCalculation", sSelectedKey);

        // Optionally, update global GSTCalculation (if required)
        oModel.setProperty("/GSTCalculation", sSelectedKey);

        // Recalculate totals
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
          oModel.setProperty("/gstEditable", true);

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
          const oQuotationItem = oView.getModel("QuotationModel");
          const sQuotationNo = oSingleModel.getProperty("/QuotationNo");

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
            CGST: oQuotationItem.getProperty("/CGST"),
            SGST: oQuotationItem.getProperty("/SGST"),
            IGST: oQuotationItem.getProperty("/IGST"),
            SubTotal: oQuotationItem.getProperty("/SubTotal"),
            SubTotalNotGST: oQuotationItem.getProperty("/SubTotalNotGST"),
            TotalSum: oQuotationItem.getProperty("/TotalSum"),
          };

          const filtres = {
            QuotationNo: sQuotationNo
          };

          const aItemArray = oView.getModel("QuotationModel").getProperty("/QuotationItemModel") || [];

          const Items = aItemArray.map((item) => {
            const oFilters = {
              QuotationNo: sQuotationNo,
              SlNo: item.SlNo || ""
            };

            // Include flag if it's a new item
            if (item.flag === "create") {
              oFilters.flag = "create";
            }

            return {
              data: {
                QuotationNo: sQuotationNo,
                SAC: item.SAC || "",
                Days: item.Days || 0,
                UnitPrice: item.UnitPrice || 0,
                Total: item.Total || "0.00",
                Currency: item.Currency || data.Currency,
                Description: item.Description || "",
                GSTCalculation: item.GSTCalculation || "Yes",
                Discount: item.Discount || "0.00"
              },
              filters: oFilters
            };
          });

          const payload = {
            data,
            filtres,
            Items
          };

          try {
            const response = await this.ajaxUpdateWithJQuery("Quotation", payload);
            this.closeBusyDialog();
            if (response.success === true) {
              MessageToast.show(`Quotation updated successfully!`);
              oModel.setProperty("/editable", false); // Exit edit mode
              // this.getRouter().navTo("RouteHrQuotation");
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