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
        this.scrollToSection("HQD_id_QuotationDetailsPage", "HQD_id_Section");
        await this._fetchCommonData("Quotation", "QuotationPDFModel", {});
        await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", {});
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        var oVisiModel = new JSONModel();

        if (sQuotationNo === "new") {
          //  Set Busy true on dropdowns
          this.byId("HQD_id_Country").setBusy(true);
          this.byId("HQD_id_BranchCode").setBusy(true);
          this.byId("HQD_id_Curency").setBusy(true);
            await this._fetchCommonData("Currency", "CurrencyModel");
            await this._fetchCommonData("Country", "CountryModel");
            await this._fetchCommonData("BaseLocation", "BrachModel");
            this._fetchCommonData("CompanyInvoiceSAC", "SACModel", {});

          //  Set Busy false after data has loaded
          this.byId("HQD_id_Country").setBusy(false);
          this.byId("HQD_id_BranchCode").setBusy(false);
          this.byId("HQD_id_Curency").setBusy(false);

          // ... continue with your model binding and setup
          var oRawData = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
          var oToday = new Date();
          oToday.setHours(0, 0, 0, 0);
          var oMinDate = new Date(oToday);
          oMinDate.setFullYear(oToday.getFullYear() - 100);
          var oValidUntil = new Date(oToday);
          oValidUntil.setDate(oValidUntil.getDate() + 30);

          var sMobileNo = oRawData.mobileNo || "";
          var sActualMobileNo = sMobileNo.startsWith("+91") ? sMobileNo.slice(3) : sMobileNo;

          var oBlankModel = new JSONModel({
            Date: oToday,
            ValidUntil: oValidUntil,
            CompanyName: oRawData.companyName,
            CompanyAddress: oRawData.longAddress,
            CompanyGSTNO: oRawData.gstin,
            CompanyEmailID: oRawData.carrerEmail,
            CompanyMobileNo: sActualMobileNo,
            STDCode: "+91",
            Country: "India",
            Branch: "KLB01",
            Currency: "INR",
            gstEditable: true,
            IGSTSelected: false,
            CGSTVisible: true,
            Percentage: 9,
            SGSTVisible: true,
            IGSTVisible: false
          });

          this.getView().setModel(oBlankModel, "SingleCompanyModel");

          var oQuotationModel = new JSONModel({
            QuotationItemModel: [],
            CGSTSelected: true,
            IGSTSelected: false,
            CGSTVisible: true,
            SGSTVisible: true,
            IGSTVisible: false,
            ShowGSTFields: true
          });

          this.getView().setModel(oQuotationModel, "QuotationModel");

          this.updateTotalAmount();

          var oDatePicker = this.getView().byId("HQD_id_Quotation");
          oDatePicker.setDateValue(oToday);
          oDatePicker.setMinDate(oMinDate);
          oDatePicker.setMaxDate(oToday);

          var oValidPicker = this.getView().byId("HQD_id_QuotationValid");
          oValidPicker.setMaxDate(oValidUntil);
          oValidPicker.setDateValue(oValidUntil);

          oVisiModel.setData({ editable: true });
          this.getView().setModel(oVisiModel, "visiablityPlay");
        }
        // Inside the onRouteMatched function's else block (edit mode)
        else {
          await this._fetchCommonData("Currency", "CurrencyModel");
          await this._fetchCommonData("Country", "CountryModel");
          await this._fetchCommonData("BaseLocation", "BrachModel");
          this._fetchCommonData("CompanyInvoiceSAC", "SACModel", {});
          // Edit Mode
          this._fetchCommonData("EmailContent", "CCMailModel", { Type: "Quotation" });
          var aQuotations = this.getView().getModel("QuotationPDFModel").getData();
          var oSelectedQuotation = aQuotations.find(item => item.QuotationNo === sQuotationNo);
          if (oSelectedQuotation) {
            var oSelectedModel = new JSONModel(oSelectedQuotation);

            // Determine GST values
            var cgst = parseFloat(oSelectedQuotation.CGST || 0);
            var sgst = parseFloat(oSelectedQuotation.SGST || 0);
            var igst = parseFloat(oSelectedQuotation.IGST || 0);

            // Calculate visibility and selection flags
            var cgstVisible = (cgst > 0 || sgst > 0);
            var sgstVisible = cgstVisible;
            var igstVisible = (igst > 0);
            var cgstSelected = (cgst > 0 || sgst > 0);
            var igstSelected = (igst > 0);
            oSelectedModel.setProperty("/gstEditable", false); // Disable editing

            // Convert Notes from HTML to plain text for display
            var sNotes = oSelectedModel.getProperty("/Notes");
            if (sNotes) {
              var tmpDiv = document.createElement("div");
              tmpDiv.innerHTML = sNotes;
              oSelectedModel.setProperty("/Notes", tmpDiv.textContent || tmpDiv.innerText || "");
            }
            this.getView().setModel(oSelectedModel, "SingleCompanyModel");

            setTimeout(() => {
              const oEditor = this.byId("HQD_id_Notes");
              if (oEditor && sNotes) {
                oEditor._oEditor?.editorManager?.activeEditor?.setContent(sNotes);
              }
            }, 100)
            // Set flags in QuotationModel after fetching items
            try {
              const response = await this.ajaxReadWithJQuery("QuotationItem", { QuotationNo: sQuotationNo });
              if (response && response.data) {
                var aItems = Array.isArray(response.data) ? response.data : [response.data];
                var oQuotationModel = new JSONModel({
                  QuotationItemModel: aItems,
                  CGSTSelected: cgstSelected,
                  IGSTSelected: igstSelected,
                  CGSTVisible: cgstVisible,
                  SGSTVisible: sgstVisible,
                  IGSTVisible: igstVisible
                });
                this.getView().setModel(oQuotationModel, "QuotationModel");
                this.updateTotalAmount();
              }
            } catch (e) {
              console.error("Error loading items", e);
            }
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
        utils._LCstrictValidationComboBox(oEvent);
        var sSelectedKey = oEvent.getSource().getSelectedKey();
        var oSTDCodeField = this.byId("HQD_id_mobileNumber");
        var oCustomerSTDCodeField = this.byId("HQD_id_CustomerNumberSTD");
        // var oMobileNumberField = this.byId("HQD_id_InputCompanyMobileNo");
        var oCurrencyCombo = this.byId("HQD_id_Curency");
        var oQuotationModel = this.getView().getModel("QuotationModel");
        var oSingleCompanyModel = this.getView().getModel("SingleCompanyModel");
        var oVisibilityModel = this.getView().getModel("visiablityPlay");

        if (sSelectedKey === "India") {
          oSTDCodeField.setValue("+91");
          oCustomerSTDCodeField.setValue("+91");
          oCurrencyCombo.setSelectedKey("INR");
          // Reset all tax selections and visibility
          oQuotationModel.setProperty("/CGSTSelected", true); oQuotationModel.setProperty("/IGSTSelected", false); oQuotationModel.setProperty("/CGSTVisible", true); oQuotationModel.setProperty("/SGSTVisible", true); oQuotationModel.setProperty("/IGSTVisible", false); oSingleCompanyModel.setProperty("/Percentage", 9);
          this._fetchCommonData("BaseLocation", "BrachModel");
          oQuotationModel.setProperty("/ShowGSTFields", true); oSingleCompanyModel.setProperty("/Currency", "INR"); oVisibilityModel.setProperty("/showBranch", true);

        }
        else {
          this.CountryAndCity()
          var oRawData = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
          var sMobileNo = oRawData.mobileNo || "";
          var sActualMobileNo = sMobileNo;
          if (sMobileNo.startsWith("+91")) {
            sActualMobileNo = sMobileNo.slice(3); // remove +91
          }
          oSingleCompanyModel.setProperty("/Branch", "");
          oSingleCompanyModel.setProperty("/Currency", "INR"); oSingleCompanyModel.setProperty("/STDCode", "+91"); oSingleCompanyModel.setProperty("/Country", sSelectedKey); oSingleCompanyModel.setProperty("/gstEditable", true);
          oSingleCompanyModel.setProperty("/CompanyAddress", oRawData.longAddress); oSingleCompanyModel.setProperty("/CompanyName", oRawData.companyName); oSingleCompanyModel.setProperty("/CompanyGSTNO", oRawData.gstin); oSingleCompanyModel.setProperty("/CompanyEmailID", oRawData.carrerEmail); oSingleCompanyModel.setProperty("/CompanyMobileNo", sActualMobileNo);
        }
        // Reset value state if no value
        if (oEvent.getSource().getValue() === '') {
          oEvent.getSource().setValueState("None");
        }
      },
      CountryAndCity: function () {
        var Code = this.getView().getModel("CountryModel").getData().filter((item) => item.countryName === this.byId("HQD_id_Country").getValue());
        var oFilter = new sap.ui.model.Filter("CountryCode", sap.ui.model.FilterOperator.EQ, Code[0].code);
        this.byId("HQD_id_BranchCode").getBinding("items").filter(oFilter);
      },

      HQD_onBrachChange: function (oEvent) {
        var sSelectedBranchCode = oEvent.getSource().getSelectedKey();
        var aCompanyDetails = this.getView().getModel("CompanyCodeDetailsModel").getData();

        var oMatchedBranch = aCompanyDetails.find(function (entry) {
          return entry.branchCode === sSelectedBranchCode;
        });

        if (oMatchedBranch) {
          var oSingleCompanyModel = this.getView().getModel("SingleCompanyModel");

          // Get mobile number and extract STD code and number
          var sMobileNo = oMatchedBranch.mobileNo || "";
          var sSTDCode = "";
          var sActualMobileNo = sMobileNo;

          if (sMobileNo.startsWith("+91")) {
            sSTDCode = "+91";
            sActualMobileNo = sMobileNo.slice(3); // remove +91
          }
          oSingleCompanyModel.setProperty("/CompanyName", oMatchedBranch.companyName || "");
          oSingleCompanyModel.setProperty("/CompanyAddress", oMatchedBranch.longAddress || "");
          oSingleCompanyModel.setProperty("/CompanyGSTNO", oMatchedBranch.gstin || "");
          oSingleCompanyModel.setProperty("/CompanyEmailID", oMatchedBranch.carrerEmail || "");
          oSingleCompanyModel.setProperty("/CompanyMobileNo", sActualMobileNo);
          oSingleCompanyModel.setProperty("/STDCode", sSTDCode);
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


        oQuotationModel.setProperty("/CGST", 0); oQuotationModel.setProperty("/SGST", 0);
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
      HQD_onPercentageChange: function () {
        this.updateTotalAmount()
      },
      onSelectCGST: function (oEvent) {
        // Uncheck IGST checkbox and ensure only CGST is selected
        this.getView().byId("HQD_id_CheckboxIGS").setSelected(false);

        var oModel = this.getView().getModel("SingleCompanyModel");
        var oQuotationModel = this.getView().getModel("QuotationModel");

        oModel.setProperty("/CGSTSelected", true); // Mark CGST as selected
        oModel.setProperty("/IGSTSelected", false); // Unselect IGST

        // Update visibility for CGST/SGST and hide IGST
        oModel.setProperty("/CGSTVisible", true); oModel.setProperty("/SGSTVisible", true);
        oModel.setProperty("/IGSTVisible", false); oQuotationModel.setProperty("/CGSTVisible", true); oQuotationModel.setProperty("/SGSTVisible", true);
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
        // oQuotationModel.setProperty("/Percentage", 18);
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
      HQD_onItemDescriptionLiveChange: function (oEvent) {
        utils._LCvalidateMandatoryField(oEvent);
      },
      HQD_STDCode: function (oEvent) {
        utils._LCstrictValidationComboBox(oEvent);
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
          oQuotationModel.setProperty("/CGSTVisible", false); oQuotationModel.setProperty("/SGSTVisible", false); oQuotationModel.setProperty("/IGSTVisible", false);
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
          oQuotationModel.setProperty("/CGSTVisible", false); oQuotationModel.setProperty("/SGSTVisible", false); oQuotationModel.setProperty("/IGSTVisible", false);
          oQuotationModel.setProperty("/ShowGSTFields", false);
          oSingleCompanyModel.setProperty("/Percentage", "");
          oQuotationModel.setProperty("/CGSTSelected", false);
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
      HQD_onDiscountInfoPress: function (oEvent) {
        if (!this._oPopover) {
          this._oPopover = new sap.m.Popover({
            contentWidth: "400px",
            contentHeight: "auto",
            showHeader: false,
            placement: sap.m.PlacementType.Bottom,
            content: [
              new sap.m.VBox({
                alignItems: "Center",
                justifyContent: "Center",
                width: "100%",
                items: [
                  new sap.m.Text({
                    text: this.i18nModel.getText("discountInfoText"),
                    wrapping: true
                  })
                ]
              }).addStyleClass("customPopoverContent")
            ]
          });
          this.getView().addDependent(this._oPopover);
        }
        this._oPopover.openBy(oEvent.getSource());
      },
      HQD_onPressSubmit: async function () {
        const oView = this.getView();
        var that = this
        // Validate RichTextEditor content
        const oRichTextEditor = this.byId("HQD_id_Notes");
        const oNotesHTML = oRichTextEditor?._oEditor?.editorManager?.activeEditor?.getContent({ format: 'html' }) || "";

        const oCurrency1 = this.byId("HQD_id_Curency").getSelectedKey();

        const isINR = oCurrency1 === "INR";
        oView.getModel("QuotationModel").getData()
        // Perform other validations
        const bIsValid =
          utils._LCvalidateDate(this.byId("HQD_id_Quotation"), "ID") &&
          utils._LCvalidateDate(this.byId("HQD_id_QuotationValid"), "ID") &&
          utils._LCstrictValidationComboBox(this.byId("HQD_id_Country"), "ID") &&
          utils._LCvalidateName(this.byId("HQD_id_InputCompanyName"), "ID") &&
          utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCompanyMobileNo"), "ID") &&
          utils._LCvalidateEmail(this.byId("HQD_id_CompanyEmailID"), "ID") &&
          (!isINR || utils._LCvalidateGstNumber(this.byId("HQD_id_CompGSTNO"), "ID")) &&
          utils._LCstrictValidationComboBox(this.byId("HQD_id_Curency"), "ID") &&
          utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCompanyAddress"), "ID") &&
          utils._LCvalidateMandatoryField(this.byId("HQD_id_CustomerName"), "ID") &&
          utils._LCvalidateEmail(this.byId("HQD_id_CustomerEmailID"), "ID") &&
          utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCustomerMobileNo"), "ID") && utils._LCstrictValidationComboBox(this.byId("HQD_id_CustomerNumberSTD"), "ID") && utils._LCstrictValidationComboBox(this.byId("HQD_id_mobileNumber"), "ID") &&
          utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCustomerAddress"), "ID") &&
          (!isINR || utils._LCvalidateMandatoryField(this.byId("HQD_id_Percentage"), "ID"));

        if (!bIsValid) {
          MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          return;
        }

        // Get values from QuotationModel
        const oQuotationModel = oView.getModel("QuotationModel");
        const oQuotationData = oQuotationModel.getData();
        const oData = oView.getModel("SingleCompanyModel");
        const ovalaue = oData.getData();
        // Validate all item descriptions are filled
        const aItemArray1 = oQuotationModel.getProperty("/QuotationItemModel") || [];
        const bAllDescriptionsFilled = aItemArray1.every(item =>
          item.Description && item.Description.trim().length > 0
        );

        if (!bAllDescriptionsFilled) {
          MessageToast.show(this.i18nModel.getText("quotaionMsgDes"));
          return;
        }
        const fTotalSum = parseFloat(oQuotationData.TotalSum || "0");
        if (isNaN(fTotalSum) || fTotalSum <= 0) {
          MessageToast.show(this.i18nModel.getText("quotaionTotalmsg"));
          return;
        }
        const tmpDiv = document.createElement("div");
        tmpDiv.innerHTML = oNotesHTML;
        if (!tmpDiv.textContent.trim()) {
          MessageToast.show(this.i18nModel.getText("quotaionNotemsg"));
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
        const oCustomerStdcode = this.byId("HQD_id_CustomerNumberSTD").getValue();
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
        const oNotes = oNotesHTML; // Already extracted

        const data = {
          Date: sQuotationDate,
          ValidUntil: sValidUntilDate,
          CompanyName: oCompanyName,
          CompanyMobileNo: omobilenumber,
          CompanyEmailID: oCompanyEmail,
          Country: oCountry,
          Branch: oBranch,
          CustomerSTDCode: oCustomerStdcode,
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
            oView.getModel("SingleCompanyModel").setProperty("/QuotationNo", response.QuotationNo);
            oView.getModel("SingleCompanyModel").setProperty("/TotalSum", data.TotalSum);


            // Force model updates before generating PDF
            oView.getModel("SingleCompanyModel").updateBindings(true);
            oView.getModel("QuotationModel").updateBindings(true);

            var oDialog = new sap.m.Dialog({
              title: this.i18nModel.getText("success"),
              type: sap.m.DialogType.Message,
              state: sap.ui.core.ValueState.Success,
              content: new sap.m.Text({
                text: this.i18nModel.getText("quotaionmsg")
              }),
              beginButton: new sap.m.Button({
                text: "OK",
                type: "Accept",
                press: function () {
                  oDialog.close();
                  that.resetHQDForm();
                  that.getRouter().navTo("RouteHrQuotation");
                }
              }),
              endButton: new sap.m.Button({
                text: "Generate PDF",
                type: "Attention",
                press: function () {
                  oDialog.close();
                  // Use setTimeout to ensure UI updates complete
                  setTimeout(function () {
                    that.HQD_onPressMerge().then(function () {
                      that.resetHQDForm();
                      that.getRouter().navTo("RouteHrQuotation");
                    });
                  }, 100);
                }
              }),
              afterClose: function () {
                oDialog.destroy();
              }
            });
            oDialog.open();

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
        const oView = this.getView();
        // Force model bindings to update so latest data is reflected
        oView.getModel("SingleCompanyModel").updateBindings(true);
        oView.getModel("QuotationModel").updateBindings(true);

        // Now safely read the latest data
        const oCompanyDetailsModel = oView.getModel("CompanyCodeDetailsModel").getProperty("/0");
        const oData = oView.getModel("SingleCompanyModel").getData();
        const oQuotaionItem = oView.getModel("QuotationModel").getData();
        const aItems = oView.getModel("QuotationModel").getProperty("/QuotationItemModel") || [];

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
          unit: "mm",
          format: "a4",
          orientation: "portrait"
        });

        let y = 10; // Starting Y position
        const pageHeight = doc.internal.pageSize.getHeight();
        // Logo
        const imgblob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
        const img = await this._convertBLOBToImage(imgblob);
        doc.addImage(img, "PNG", 13, y, 45, 45);
        y += 50;

        // Header Title
        doc.setFontSize(25);
        doc.setFont("times", "bold");
        doc.text(this.i18nModel.getText("quotation"), 158, 40);

        // Company Info
        doc.setFontSize(12);
        doc.setFont("times", "bold");
        doc.text(oData.CompanyName, 13, y);
        y += 5;
        doc.setFont("times", "normal");
        const splitAddress1 = doc.splitTextToSize(oData.CompanyAddress || "", 80);
        doc.text(splitAddress1, 13, y);
        y += splitAddress1.length * 5; // estimate 5mm per line        //  Adjust Y for mobile number
        doc.text(this.i18nModel.getText("pdfmobile") + oData.STDCode + " " + oData.CompanyMobileNo, 13, y);
        y += 5;
        doc.text(this.i18nModel.getText("pdfemail") + oData.CompanyEmailID, 13, y);
        y += 5;
        doc.text(this.i18nModel.getText("pdfCustomerGst") + oData.CompanyGSTNO, 13, y);
        y += 10;

        // Quotation Metas
        doc.setFont("times", "bold");
        doc.text(this.i18nModel.getText("pdfquotationNo"), 168, y - 36, { align: "right" });
        doc.text(this.i18nModel.getText("pdfDate"), 168, y - 31, { align: "right" });
        doc.text(this.i18nModel.getText("pdfValiduntil"), 168, y - 26, { align: "right" });

        doc.setFont("times", "normal");
        doc.text(oData.QuotationNo, 172, y - 36);
        doc.text(Formatter.formatDate(oData.Date), 172, y - 31);
        doc.text(Formatter.formatDate(oData.ValidUntil), 172, y - 26);

        // Customer Info
        doc.setFont("times", "bold");
        doc.text(this.i18nModel.getText("pdfto"), 13, y);
        y += 5;
        doc.text(oData.CustomerName, 13, y);
        y += 5;
        doc.setFont("times", "normal");

        //  Properly wrap address and calculate height
        const splitAddress = doc.splitTextToSize(oData.CustomerAddress || "", 80);
        doc.text(splitAddress, 13, y);
        y += splitAddress.length * 5; // estimate 5mm per line        //  Adjust Y for mobile number
        const customerMobileText = this.i18nModel.getText("pdfmobile") + oData.STDCode + " " + oData.CustomerMobileNo;
        doc.text(customerMobileText, 13, y);
        y += 5;
        //  Adjust Y for email
        const customerEmailText = this.i18nModel.getText("pdfemail") + oData.CustomerEmailID;
        doc.text(customerEmailText, 13, y);
        y += 5;
        if (oData.CustomerGSTNO) {
          const customerGSTNo = this.i18nModel.getText("pdfCustomerGst") + oData.CustomerGSTNO;
          doc.text(customerGSTNo, 13, y);
          y += 5; // only add space if GSTIN exists
        }
        y += 5; // always add a little space before the next section

        const isINR = oData.Currency === "INR";

        // Build table body dynamically
        const body = aItems.map((item, index) => {
          const formattedDiscount = item.Discount
            ? Formatter.fromatNumber(item.Discount)
            : "0.00";

          const row = [
            index + 1,
            item.Description,
            item.Days,
            Formatter.fromatNumber(item.UnitPrice),
            formattedDiscount,
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
          ? [['Sl.No.', 'Tax', 'Description', 'Days', 'Unit Price', 'Discount', 'Total']]
          : [['Sl.No.', 'Description', 'Days', 'Unit Price', 'Discount', 'Total']];

        doc.autoTable({
          startY: y,
          head: head,
          body: body,
          theme: 'grid',
          headStyles: {
            fillColor: [41, 128, 185],
            font: "times",
            fontSize: 10
          },
          styles: {
            font: "times",
            fontSize: 10,
            cellPadding: 3,
            lineWidth: 0.5,
            lineColor: [30, 30, 30],
          },
          columnStyles: isINR
            ? {
              0: { halign: 'center' }, // Sl.No.
              1: { halign: 'center' }, // Tax
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
            },
          didParseCell: function (data) {
            if (data.section === 'head') {
              // Adjust header alignment for numeric columns
              if (isINR) {
                if ([4, 5, 6].includes(data.column.index)) {
                  data.cell.styles.halign = 'right';
                } else {
                  data.cell.styles.halign = 'center';
                }
              } else {
                if ([3, 4, 5].includes(data.column.index)) {
                  data.cell.styles.halign = 'right';
                } else {
                  data.cell.styles.halign = 'center';
                }
              }
            }
          }
        });

        y = doc.lastAutoTable.finalY;
        // Check for page overflow
        if (y + 40 > pageHeight) {
          doc.addPage();
          y = 20;
        }

        doc.setFont("times", "bold");
        doc.setFontSize(10);

        const summaryBody = [];

        // SubTotal Without GST
        summaryBody.push([
          `${this.i18nModel.getText("subTotalNotGST")} (${oData.Currency})`,
          Formatter.fromatNumber(oQuotaionItem.SubTotalNotGST)
        ]);

        // SubTotal With GST
        summaryBody.push([
          `${this.i18nModel.getText("subTotalInGST")} (${oData.Currency})`,
          Formatter.fromatNumber(oQuotaionItem.SubTotal)
        ]);

        // GST Breakdown
        if (oData.Currency !== "USD") {
          const cgstValue = parseFloat(oQuotaionItem.CGST) || 0;
          const sgstValue = parseFloat(oQuotaionItem.SGST) || 0;
          const igstValue = parseFloat(oQuotaionItem.IGST) || 0;
          const percentage = oData.Percentage || 0;

          if (cgstValue > 0 || sgstValue > 0) {
            summaryBody.push([
              `CGST (${percentage}%)`,
              Formatter.fromatNumber(cgstValue.toFixed(2))
            ]);
            summaryBody.push([
              `SGST (${percentage}%)`,
              Formatter.fromatNumber(sgstValue.toFixed(2))
            ]);
          } else if (igstValue > 0) {
            summaryBody.push([
              `IGST (${percentage}%)`,
              Formatter.fromatNumber(igstValue.toFixed(2))
            ]);
          }
        }

        const totalRowIndex = summaryBody.length; // This is after pushing total row
        summaryBody.push([
          `${this.i18nModel.getText("pdfTotal")} (${oData.Currency})`,
          Formatter.fromatNumber(oQuotaionItem.TotalSum)
        ]);

        doc.autoTable({
          startY: y,
          head: [],
          body: summaryBody,
          theme: 'plain',
          styles: {
            font: "times",
            fontSize: 10,
            halign: "right",
            cellPadding: 3
          },
          columnStyles: {
            0: { halign: "right", cellWidth: 60 },
            1: { halign: "right", cellWidth: 40 }
          },
          margin: { left: 96 },
          didParseCell: function (data) {
            const lastRowIndex = summaryBody.length - 1;

            if (data.row.index === lastRowIndex) {
              // Apply top border only for the total row (last row)
              data.cell.styles.lineWidth = { top: 0.5, right: 0, bottom: 0, left: 0 };
              data.cell.styles.lineColor = [0, 0, 0];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });
        // Update Y position
        y = doc.lastAutoTable.finalY + 5;
        // Amount in Words
        oData.AmountInWords = this.numberToWords(oData.TotalSum, oData.Currency, { maxWidth: 80 });
        doc.setFont("times", "bold");
        doc.text(this.i18nModel.getText("pdfaAmount"), 13, y);
        y += 5;
        doc.setFont("times", "normal");
        const amountHeight = doc.getTextDimensions(oData.AmountInWords || "").h;
        doc.text(oData.AmountInWords || "", 13, y, { maxWidth: 180 });
        y += amountHeight + 10;
        // Terms & Conditions with page break support
        doc.setFont("times", "bold");
        doc.text(this.i18nModel.getText("pdftermconditaion"), 13, y);
        y += 5;
        doc.setFont("times", "normal");
        const convertHtmlToTextLines = (html, maxWidth) => {
          const div = document.createElement("div");
          div.innerHTML = html;

          div.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
          div.querySelectorAll("p").forEach(p => p.appendChild(document.createTextNode("\n")));
          div.querySelectorAll("li").forEach(li => {
            const bullet = document.createTextNode(`• ${li.textContent}\n`);
            li.replaceWith(bullet);
          });

          const text = div.innerText || div.textContent || "";
          return doc.splitTextToSize(text.trim(), maxWidth);
        };

        const htmlNotes = oData.Notes || "";
        const noteLines = convertHtmlToTextLines(htmlNotes, 180);


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

        // Get binding context
        var oContext = oInput.getBindingContext("QuotationModel");
        if (!oContext) return;

        var oModel = oContext.getModel();
        var sPath = oContext.getPath();
        var oItem = oModel.getProperty(sPath);

        // Get UnitPrice and Days
        var unitPrice = parseFloat(oItem.UnitPrice || 0);
        var days = parseFloat(oItem.Days || 0);
        var itemTotal = days > 0 ? unitPrice * days : unitPrice;

        // Initialize discount
        var finalDiscount = 0;

        // Check if % entered
        var isPercentage = sUserInput.includes("%");

        // Extract number
        var sCleanValue = sUserInput.replace(/[^0-9.]/g, "");

        // Validate input
        var regex = /^[0-9]+(\.[0-9]{1,2})?$/;
        if (!sCleanValue || !regex.test(sCleanValue)) {
          oInput.setValueState("Error");
          oInput.setValueStateText(this.i18nModel.getText("discountValueText"));
          this.Discount = false;
          return;
        }

        // Parse cleaned value
        var parsedDiscount = parseFloat(sCleanValue);

        if (isPercentage) {
          finalDiscount = (parsedDiscount / 100) * itemTotal;
        } else {
          finalDiscount = parsedDiscount;
        }

        // Prevent over-discount
        if (finalDiscount > itemTotal) {
          finalDiscount = itemTotal;
        }

        // Set final values to model
        oModel.setProperty(sPath + "/Discount", finalDiscount);
        oModel.setProperty(sPath + "/IsDiscountPercentage", false); // Already converted to absolute value

        // Update input with actual discount value (not percentage)
        oInput.setValue(finalDiscount);
        oInput.setValueState("None");
        oInput.setValueStateText("");
        this.Discount = true;

        // Recalculate totals
        this.updateTotalAmount();
      },


      HQD_onPressDelete: async function (oEvent) {
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
          var oquotationitem = this.getView().getModel("QuotationModel").getData();

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
            "TotalSum": (`${Formatter.fromatNumber(oquotationitem.TotalSum)} ${oModel.Currency}`),
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
          "HQD_id_InputCustomerMobileNo", "HQD_id_InputCustomerAddress", "HQD_id_InputCustomerGSTNO", "HQD_id_mobileNumber", "HQD_id_CustomerNumberSTD"
        ];

        fields.forEach(id => {
          const oControl = this.byId(id);
          if (oControl?.setValue) oControl.setValue("");
          if (oControl?.setSelectedKey) oControl.setSelectedKey("");
          if (oControl?.setDateValue) oControl.setDateValue(null);

          if (oControl.setValueState) oControl.setValueState("None");
          if (oControl.setValueStateText) oControl.setValueStateText("");

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
        const oRadiobtn = oView.getModel("SingleCompanyModel");
        const oQuotationModel = oView.getModel("QuotationModel");
        const oQuotationData = oQuotationModel.getData();

        const bEditable = oModel.getProperty("/editable");

        if (!bEditable) {
          oModel.setProperty("/editable", true);
          oRadiobtn.setProperty("/gstEditable", true);

        } else {
          // Already in edit mode => perform Save logic
          const oRichTextEditor = this.byId("HQD_id_Notes");
          const oNotesHTML = oRichTextEditor?._oEditor?.editorManager?.activeEditor?.getContent({ format: 'html' }) || "";

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
            utils._LCvalidateMandatoryField(this.byId("HQD_id_CustomerName"), "ID") && utils._LCstrictValidationComboBox(this.byId("HQD_id_CustomerNumberSTD"), "ID") &&
            utils._LCvalidateEmail(this.byId("HQD_id_CustomerEmailID"), "ID") &&
            utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCustomerMobileNo"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCustomerAddress"), "ID") &&
            (!isINR || utils._LCvalidateMandatoryField(this.byId("HQD_id_Percentage"), "ID"));
          if (!bIsValid) {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }

          const fTotalSum = parseFloat(oQuotationData.TotalSum || "0");
          if (isNaN(fTotalSum) || fTotalSum <= 0) {
            MessageToast.show(this.i18nModel.getText("quotaionTotalmsg"));
            return;
          }

          const tmpDiv = document.createElement("div");
          tmpDiv.innerHTML = oNotesHTML;
          if (!tmpDiv.textContent.trim()) {
            MessageToast.show("Notes field is required.");
            return;
          }

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
            Country: this.byId("HQD_id_Country").getSelectedKey(),
            Branch: this.byId("HQD_id_BranchCode").getSelectedKey(),
            CompanyGSTNO: this.byId("HQD_id_CompGSTNO").getValue(),
            CompanyMobileNo: this.byId("HQD_id_InputCompanyMobileNo").getValue(),
            CustomerSTDCode: this.byId("HQD_id_CustomerNumberSTD").getValue(),
            CompanyEmailID: this.byId("HQD_id_CompanyEmailID").getValue(),
            CustomerName: this.byId("HQD_id_CustomerName").getValue(),
            CustomerAddress: this.byId("HQD_id_InputCustomerAddress").getValue(),
            CustomerMobileNo: this.byId("HQD_id_InputCustomerMobileNo").getValue(),
            CustomerGSTNO: this.byId("HQD_id_InputCustomerGSTNO").getValue(),
            CustomerEmailID: this.byId("HQD_id_CustomerEmailID").getValue(),
            Currency: this.byId("HQD_id_Curency").getSelectedKey(),
            Percentage: this.byId("HQD_id_Percentage").getValue(),
            Notes: oNotesHTML,
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

          const aItemArray2 = oView.getModel("QuotationModel").getProperty("/QuotationItemModel") || [];
          const bAllDescriptionsFilled1 = aItemArray2.every(item =>
            item.Description && item.Description.trim().length > 0
          );

          if (!bAllDescriptionsFilled1) {
            MessageToast.show("Each item must have a description.");
            return;
          }

          const Items = aItemArray2.map((item) => {
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
          this.getBusyDialog();
          try {
            const response = await this.ajaxUpdateWithJQuery("Quotation", payload);
            this.closeBusyDialog();
            if (response.success === true) {
              MessageToast.show(`Quotation updated successfully!`);
              oModel.setProperty("/editable", false); // Exit edit mode
              oRadiobtn.setProperty("/gstEditable", false);
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