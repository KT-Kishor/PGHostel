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
        this._fetchCommonData("Currency", "CurrencyModel");
        this._fetchCommonData("Country", "CountryModel");
        this._fetchCommonData("BaseLocation", "BrachModel");
        this._fetchCommonData("CompanyInvoiceSAC", "SACModel", {});

        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

        var oVisiModel = new JSONModel();

        if (sQuotationNo === "new") {
          var oToday = new Date();
          oToday.setHours(0, 0, 0, 0); // Normalize
          var oMinDate = new Date(oToday);
          oMinDate.setFullYear(oToday.getFullYear() - 100);
          var oValidUntil = new Date(oToday);
          oValidUntil.setDate(oValidUntil.getDate() + 30);
          var oBlankModel = new JSONModel({
            Date: oToday,
            ValidUntil: oValidUntil,
            CompanyName: "",
            CompanyAddress: "",
            CompanyGSTNO: "",
            CompanyEmailID: "",
            CompanyMobileNo: "",
            STDCode: "",
            Country: "",
            SelectedBranchCode: "",
            Percentage: "",
            Currency: "",
            gstEditable: true
          });
          this.getView().setModel(oBlankModel, "SingleCompanyModel");
          //  Set min date on Quotation Date
          var oDatePicker = this.getView().byId("HQD_id_Quotation");
          oDatePicker.setDateValue(oToday); // Ensure UI shows it
          oDatePicker.setMinDate(oMinDate);
          oDatePicker.setMaxDate(oToday);
          //  Set range on Valid Until Date
          var oValidPicker = this.getView().byId("HQD_id_QuotationValid");
          oValidPicker.setMaxDate(oValidUntil);
          oValidPicker.setDateValue(oValidUntil); // Ensure UI shows it

          // Show input fields as editable
          oVisiModel.setData({ editable: true, showBranch: false });

          this.getView().setModel(oVisiModel, "visiablityPlay");
        }
        else {
          // Edit Mode
          this._fetchCommonData("EmailContent", "CCMailModel", { Type: "Quotation" });
          var aQuotations = this.getView().getModel("QuotationPDFModel").getData();
          var oSelectedQuotation = aQuotations.find(item => item.QuotationNo === sQuotationNo);
          if (oSelectedQuotation) {
            var oSelectedModel = new JSONModel(oSelectedQuotation);

            // Determine GST selection based on values from database
            var cgst = parseFloat(oSelectedQuotation.CGST || 0);
            var sgst = parseFloat(oSelectedQuotation.SGST || 0);
            var igst = parseFloat(oSelectedQuotation.IGST || 0);

            if ((cgst > 0 || sgst > 0) && igst === 0) {
              oSelectedModel.setProperty("/CGSTSelected", true);
              oSelectedModel.setProperty("/IGSTSelected", false);
              oSelectedModel.setProperty("/CGSTVisible", true);
              oSelectedModel.setProperty("/SGSTVisible", true);
              oSelectedModel.setProperty("/IGSTVisible", false);
            } else if (igst > 0 && cgst === 0 && sgst === 0) {
              oSelectedModel.setProperty("/CGSTSelected", false);
              oSelectedModel.setProperty("/IGSTSelected", true);
              oSelectedModel.setProperty("/CGSTVisible", false);
              oSelectedModel.setProperty("/SGSTVisible", false);
              oSelectedModel.setProperty("/IGSTVisible", true);
            } else {
              // Default/fallback
              oSelectedModel.setProperty("/CGSTSelected", false);
              oSelectedModel.setProperty("/IGSTSelected", false);
              oSelectedModel.setProperty("/CGSTVisible", false);
              oSelectedModel.setProperty("/SGSTVisible", false);
              oSelectedModel.setProperty("/IGSTVisible", false);
            }

            oSelectedModel.setProperty("/gstEditable", false); // Disable editing
            this.getView().setModel(oSelectedModel, "SingleCompanyModel");
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

        var sSelectedKey = oEvent.getSource().getSelectedKey();
        var oSTDCodeField = this.byId("HQD_id_mobileNumber");
        var oMobileNumberField = this.byId("HQD_id_InputCompanyMobileNo");
        var oCurrencyCombo = this.byId("HQD_id_Curency");
        var oQuotationModel = this.getView().getModel("QuotationModel");
        var oSingleCompanyModel = this.getView().getModel("SingleCompanyModel");
        var oVisibilityModel = this.getView().getModel("visiablityPlay");

        if (sSelectedKey === "India") {
          oSTDCodeField.setValue("+91");
          oCurrencyCombo.setSelectedKey("INR");
          oSingleCompanyModel.setProperty("/CGSTSelected", true);
          oSingleCompanyModel.setProperty("/Percentage", 9);

          oQuotationModel.setProperty("/ShowGSTFields", true);
          oSingleCompanyModel.setProperty("/STDCode", "+91");
          oSingleCompanyModel.setProperty("/Currency", "INR");
          oVisibilityModel.setProperty("/showBranch", true);
          oQuotationModel.setProperty("/CGSTVisible", true);
          oQuotationModel.setProperty("/SGSTVisible", true);
        } else {
          oSTDCodeField.setValue("");
          oMobileNumberField.setValue("");
          oQuotationModel.setProperty("/ShowGSTFields", false);
          oVisibilityModel.setProperty("/showBranch", false);
          // Clear other dependent fields if needed
          oSingleCompanyModel.setProperty("/STDCode", "");
          oSingleCompanyModel.setProperty("/Currency", "");
          oSingleCompanyModel.setProperty("/SelectedBranchCode", "");
        }

        // Reset value state if no value
        if (oEvent.getSource().getValue() === '') {
          oEvent.getSource().setValueState("None");
        }
      },

      HQD_onBrachChange: function (oEvent) {
        var sSelectedBranchCode = oEvent.getSource().getSelectedKey();
        var aCompanyDetails = this.getView().getModel("CompanyCodeDetailsModel").getData();

        var oMatchedBranch = aCompanyDetails.find(function (entry) {
          return entry.branchCode === sSelectedBranchCode;
        });

        if (oMatchedBranch) {
          var oSingleCompanyModel = this.getView().getModel("SingleCompanyModel");

          oSingleCompanyModel.setProperty("/CompanyName", oMatchedBranch.companyName || "");
          oSingleCompanyModel.setProperty("/CompanyAddress", oMatchedBranch.longAddress || "");
          oSingleCompanyModel.setProperty("/CompanyGSTNO", oMatchedBranch.gstin || "");
          oSingleCompanyModel.setProperty("/CompanyEmailID", oMatchedBranch.carrerEmail || "");
          oSingleCompanyModel.setProperty("/CompanyMobileNo", oMatchedBranch.mobileNo || "");
          oSingleCompanyModel.setProperty("/STDCode", "+91");
        }
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
        var oSelected = oView.getModel("SingleCompanyModel");

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
          oSelected.setProperty("/CGSTSelected", false);
          oSelected.setProperty("/IGSTSelected", false);
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
          if (oItem.IsDiscountPercentage) {
            var percent = parseFloat(oItem.Discount || 0) / 100;
            iDiscount = iItemTotal * percent;
          } else {
            iDiscount = parseFloat(oItem.Discount || 0);
          }

          if (iDiscount > iItemTotal) {
            iDiscount = iItemTotal;
          }

          var finalItemTotal = iItemTotal - iDiscount;
          oItem.Total = parseFloat(finalItemTotal.toFixed(2));

          // Corrected GST check using oItem
          if (oItem.GSTCalculation === "Yes") {
            subTotalTaxable += oItem.Total;
          } else {
            subTotalNonTaxable += oItem.Total;
          }
        });

        // Update items back into model
        oQuotationModel.setProperty("/QuotationItemModel", aItems);

        oQuotationModel.setProperty("/SubTotal", parseFloat(subTotalTaxable.toFixed(2)));
        oQuotationModel.setProperty("/SubTotalNotGST", parseFloat(subTotalNonTaxable.toFixed(2)));

        // Tax calculations remain unchanged
        var oSingleCompanyModel = oView.getModel("SingleCompanyModel");

        var cgstPerc = oQuotationModel.getProperty("/CGSTSelected")
          ? parseFloat(oSingleCompanyModel.getProperty("/Percentage") || 9)
          : 0;
        var sgstPerc = oQuotationModel.getProperty("/CGSTSelected")
          ? parseFloat(oSingleCompanyModel.getProperty("/Percentage") || 9)
          : 0;
        var igstPerc = oQuotationModel.getProperty("/IGSTSelected")
          ? parseFloat(oSingleCompanyModel.getProperty("/Percentage") || 18)
          : 0;


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
          oModelDataPro.setProperty("/ShowSACAndGSTCalculation", true);;
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
          oModelDataPro.setProperty("/ShowSACAndGSTCalculation", false);;

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
      // HQD_onNotesChange: function (oEvent) {
      //   utils._LCvalidateMandatoryField(oEvent)
      // },

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
        const oBranch = this.byId("HQD_id_BranchCode").getSelectedKey();
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
          Branch: oBranch,
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
      numberToWords: function (num, currency) {
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

        const word = inWords(Math.floor(num));
        let currencyText = "";

        if (currency === "INR") {
          currencyText = "Rupees";
        } else if (currency === "USD") {
          currencyText = "Dollars";
        } else {
          currencyText = "Currency";
        }

        return word + " " + currencyText + " Only";
      },

      HQD_onPressMerge: async function () {
        const oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
        const oData = this.getView().getModel("SingleCompanyModel").getData();
        const oQuotaionItem = this.getView().getModel("QuotationModel").getData();
        const aItems = this.getView().getModel("QuotationModel")?.getProperty("/QuotationItemModel") || [];

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
          unit: "mm",
          format: "a4",
          orientation: "portrait"
        });

        let y = 20; // Starting Y position
        const pageHeight = doc.internal.pageSize.getHeight();

        // Logo
        const imgblob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
        const img = await this._convertBLOBToImage(imgblob);
        doc.addImage(img, "PNG", 13, y, 50, 50);
        y += 60;

        // Header Title
        doc.setFontSize(25);
        doc.setFont("helvetica", "bold");
        doc.text(this.i18nModel.getText("quotation"), 135, 40);

        // Company Info
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(oData.CompanyName, 13, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const companyAddrHeight = doc.getTextDimensions(oData.CompanyAddress).h;
        doc.text(oData.CompanyAddress, 13, y, { maxWidth: 60 });
        y += companyAddrHeight + 20;

        doc.text(this.i18nModel.getText("pdfmobile") + oData.STDCode + " " + oData.CompanyMobileNo, 13, y);
        y += 5;
        doc.text(this.i18nModel.getText("pdfemail") + oData.CompanyEmailID, 13, y);
        y += 10;

        // Quotation Meta
        doc.setFont("helvetica", "bold");
        doc.text(this.i18nModel.getText("pdfquotationNo"), 168, y - 45, { align: "right" });
        doc.text(this.i18nModel.getText("pdfDate"), 168, y - 40, { align: "right" });
        doc.text(this.i18nModel.getText("pdfValiduntil"), 168, y - 35, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.text(oData.QuotationNo, 172, y - 45);
        doc.text(Formatter.formatDate(oData.Date), 172, y - 40);
        doc.text(Formatter.formatDate(oData.ValidUntil), 172, y - 35);

        // Customer Info

        doc.setFont("helvetica", "bold");
        doc.text(this.i18nModel.getText("pdfto"), 13, y);
        y += 5;

        doc.text(oData.CustomerName, 13, y);
        y += 5;

        doc.setFont("helvetica", "normal");

        //  Properly wrap address and calculate height
        const splitAddress = doc.splitTextToSize(oData.CustomerAddress || "", 80);
        doc.text(splitAddress, 13, y);
        y += splitAddress.length * 5; // estimate 5mm per line        //  Adjust Y for mobile number
        const customerMobileText = this.i18nModel.getText("pdfmobile") + oData.STDCode + "" + oData.CustomerMobileNo;
        doc.text(customerMobileText, 13, y);
        y += 5;
        //  Adjust Y for email
        const customerEmailText = this.i18nModel.getText("pdfemail") + oData.CustomerEmailID;
        doc.text(customerEmailText, 13, y);
        y += 10; // add some space before next section


        const isINR = oData.Currency === "INR";

        // Build table body dynamically
        const body = aItems.map((item, index) => {
          const row = [
            index + 1,
            item.Description,
            item.Days,
            Formatter.fromatNumber(item.UnitPrice),
            Formatter.fromatNumber(item.Discount),
            Formatter.fromatNumber(item.Total)
          ];

          // Insert GST Calculation as 2nd column if INR
          if (isINR) {
            row.splice(1, 0, item.GSTCalculation);
          }
          return row;
        });

        // Build table head dynamically
        const head = isINR
          ? [['Sl.No.', 'GST Calculation', 'Description', 'Days', 'Unit Price', 'Discount', 'Total']]
          : [['Sl.No.', 'Description', 'Days', 'Unit Price', 'Discount', 'Total']];

        // AutoTable
        doc.autoTable({
          startY: y,
          head: head,
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: {
            font: "helvetica",
            fontSize: 10,
            cellPadding: 3
          },
          columnStyles: isINR
            ? {
              0: { halign: 'center' }, // Sl.No.
              1: { halign: 'center' }, // GST Calculation
              2: { halign: 'center' }, // Description
              3: { halign: 'center' }, // Days
              4: { halign: 'right' },  // Unit Price
              5: { halign: 'right' },  // Discount
              6: { halign: 'right' }   // Total
            }
            : {
              0: { halign: 'center' }, // Sl.No.
              1: { halign: 'center' }, // Description
              2: { halign: 'center' }, // Days
              3: { halign: 'right' },  // Unit Price
              4: { halign: 'right' },  // Discount
              5: { halign: 'right' }   // Total
            }
        });


        y = doc.lastAutoTable.finalY + 10;

        // Check for page overflow
        if (y + 40 > pageHeight) {
          doc.addPage();
          y = 20;
        }

        // SubTotal Without GST
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`${this.i18nModel.getText("subTotalNotGST")} (${oData.Currency}): ${Formatter.fromatNumber(oData.SubTotalNotGST)}`, 190, y, { align: "right" });
        y += 8;

        // Subtotal and Tax
        doc.text(`${this.i18nModel.getText("subTotalInGST")} (${oData.Currency}): ${Formatter.fromatNumber(oData.SubTotal)}`, 190, y, { align: "right" });
        y += 8;

        if (oData.Currency !== "USD") {
          const cgstValue = parseFloat(oData.CGST) || 0;
          const sgstValue = parseFloat(oData.SGST) || 0;
          const percentage = oData.Percentage || 0;

          const cgst = Formatter.fromatNumber(cgstValue.toFixed(2));
          const sgst = Formatter.fromatNumber(sgstValue.toFixed(2));

          doc.text(`CGST (${percentage}%): ${cgst}`, 190, y, { align: "right" });
          y += 8;
          doc.text(`SGST (${percentage}%): ${sgst}`, 190, y, { align: "right" });
          y += 10;
        }
        // Total
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(105, y, 196, y);
        y += 5;
        doc.text(`${this.i18nModel.getText("pdfTotal")} (${oData.Currency}): ${Formatter.fromatNumber(oData.TotalSum)}`, 190, y, { align: "right" });
        y += 5;

        // Amount in Words
        oData.AmountInWords = this.numberToWords(oData.TotalSum, oData.Currency, { maxWidth: 80 });
        doc.setFont("helvetica", "bold");
        doc.text(this.i18nModel.getText("pdfaAmount"), 13, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const amountHeight = doc.getTextDimensions(oData.AmountInWords || "").h;
        doc.text(oData.AmountInWords || "", 13, y, { maxWidth: 180 });
        y += amountHeight + 10;

        // Terms & Conditions with page break support
        doc.setFont("helvetica", "bold");
        doc.text(this.i18nModel.getText("pdftermconditaion"), 13, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        const htmlNotes = oData.Notes || "";
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlNotes;
        const plainText = tempDiv.innerText || tempDiv.textContent || "";
        const noteLines = doc.splitTextToSize(plainText, 180);

        const lineHeight = 5;
        const availableHeight = pageHeight - y;

        let linesPerPage = Math.floor(availableHeight / lineHeight);
        let currentLine = 0;

        while (currentLine < noteLines.length) {
          if (y + lineHeight > pageHeight) {
            doc.addPage();
            y = 20;
          }
          const remainingLines = noteLines.length - currentLine;
          const linesToWrite = Math.min(linesPerPage, remainingLines);
          const linesChunk = noteLines.slice(currentLine, currentLine + linesToWrite);
          doc.text(linesChunk, 13, y);
          y += linesChunk.length * lineHeight;
          currentLine += linesToWrite;
          // Reset linesPerPage for next page if needed
          linesPerPage = Math.floor((pageHeight - 20) / lineHeight);
        }

        // Save PDF
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
        var sPath = oContext.getPath();

        // Update model with cleaned value and percentage flag
        oModel.setProperty(sPath + "/Discount", sCleanValue);
        oModel.setProperty(sPath + "/IsDiscountPercentage", isPercentage);

        // Recalculate all totals
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
        var oQuotationModel = oContext.getModel();

        // Update GSTCalculation
        oQuotationModel.setProperty(sPath + "/GSTCalculation", sSelectedKey);

        // Get SACModel data
        var oSACModel = this.getView().getModel("SACModel");
        var aSACList = oSACModel ? oSACModel.getData() : [];

        // Apply logic based on selection
        if (sSelectedKey === "Yes") {
          // Set SAC to first ID's sac
          if (aSACList.length > 0) {
            oQuotationModel.setProperty(sPath + "/SAC", aSACList[0].sac);
          }
        } else {
          // Set SAC to second ID's sac
          if (aSACList.length > 1) {
            oQuotationModel.setProperty(sPath + "/SAC", aSACList[1].sac);
          } else {
            oQuotationModel.setProperty(sPath + "/SAC", "-");
          }
        }
        // Optionally update global GSTCalculation
        oQuotationModel.setProperty("/GSTCalculation", sSelectedKey);

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