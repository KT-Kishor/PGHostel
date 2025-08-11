sap.ui.define(
  [
    "./BaseController",
    "sap/ui/export/Spreadsheet",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../utils/validation",
  ],
  function (BaseController,Spreadsheet,Formatter,JSONModel,MessageToast,MessageBox,validation) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.MSA", {
      Formatter: Formatter,
      onInit: function () {
        this.getRouter().getRoute("RouteMSA").attachMatched(this._onRouteMatched, this);
      },
      _onRouteMatched: async function () {
        this.i18nModel = this.getOwnerComponent().getModel("i18n").getResourceBundle();
        try {
          const LoginFunction = await this.commonLoginFunction("MSA&SOW");
          if (!LoginFunction) return;
          this._isClearPressed = false;
          this.closeBusyDialog();
          this._fetchCommonData("ManageCustomer", "CompanyNameModel");
          const currentYear = new Date().getFullYear();
          let fyStart, fyEnd;
          if (new Date().getMonth() >= 3) {
            fyStart = new Date(currentYear, 3, 1); // April 1
            fyEnd = new Date(currentYear + 1, 2, 31); // March 31 next year
          } else {
            fyStart = new Date(currentYear - 1, 3, 1); // April 1 last year
            fyEnd = new Date(currentYear, 2, 31); // March 31 this year
          }
          const dateRangeControl = this.byId("id_msa_date"); // Set the date range UI
          if (dateRangeControl) {
            dateRangeControl.setDateValue(fyStart);
            dateRangeControl.setSecondDateValue(fyEnd);
          }
          await this.MSA_onSearch();
          this.getView().getModel("LoginModel").setProperty("/HeaderName", "MSA Details");
        } catch (error) {
          sap.m.MessageToast.show(error.message || error.responseText);
        } finally {
          this.closeBusyDialog();
        }
        this.initializeBirthdayCarousel();
      },
      onPressback: function () {
        this.getRouter().navTo("RouteTilePage");
      },
      onPressClear: function () {
        this.byId("MSA_id_CompanyName").setValue("");
        this.byId("MSA_id_Type").setValue("");
        this.byId("id_msa_date").setValue("");
        this._isClearPressed = true;
      },
      MSA_onAddCustomer: function () {
        this.getRouter().navTo("RouteManageCustomer", {
          value: "MSA",
        });
      },
      onLogout: function () {
        this.CommonLogoutFunction();
      },
      MSA_AddmsaDetails: function () {
        this.getRouter().navTo("RouteMSADetails");
      },
      OnPressNavigationMsaDet: function (oEvent) {
        var MsaID = oEvent
          .getSource()
          .getBindingContext("MSADisplayModel")
          .getProperty("MsaID");
        this.getRouter().navTo("RouteMSAEdit", {
          sPath: MsaID,
        });
      },
      MSA_onSearch: async function () {
        try {
          this.getBusyDialog();
          const filterItems =
            this.byId("MSA_id_AdminFilter").getFilterGroupItems();
          const params = {};
          let msaDateProvided = false;

          filterItems.forEach((item) => {
            const control = item.getControl();
            const key = item.getName();

            if (control && typeof control.getValue === "function") {
              const value = control.getValue().trim();
              if (key === "CreateMSADate" && value.includes("-")) {
                const [start, end] = value.split("-").map((date) => date.trim().split("/").reverse().join("-"));
                params.StartDate = start;
                params.EndDate = end;
                msaDateProvided = true;
              } else {
                params[key] = value;
              }
            }
          });

          // Financial year logic
          const currentYear = new Date().getFullYear();
          let fyStart, fyEnd, financialYearLabel;
          if (new Date().getMonth() >= 3) {
            fyStart = new Date(currentYear, 3, 1);
            fyEnd = new Date(currentYear + 1, 2, 31);
            financialYearLabel = `${currentYear}-${currentYear + 1}`;
          } else {
            fyStart = new Date(currentYear - 1, 3, 1);
            fyEnd = new Date(currentYear, 2, 31);
            financialYearLabel = `${currentYear - 1}-${currentYear}`;
          }

          const formatDate = (date) => date.toISOString().split("T")[0];
          if (this._isClearPressed) {
            // fetch all data, no filters
            delete params.StartDate;
            delete params.EndDate;
            delete params.FinancialYear;
            this._isClearPressed = false; // reset flag
          } else if (!msaDateProvided) {
            // No date selected by user → apply financial year filter
            params.StartDate = formatDate(fyStart);
            params.EndDate = formatDate(fyEnd);
            params.FinancialYear = financialYearLabel;
            const dateRangeControl = this.byId("id_msa_date");
            if (dateRangeControl) {
              dateRangeControl.setDateValue(fyStart);
              dateRangeControl.setSecondDateValue(fyEnd);
            }
          } else {
            // Date was selected by user → check if it's financial year
            const startDate = new Date(params.StartDate);
            const endDate = new Date(params.EndDate);
            if (
              startDate.getTime() === fyStart.getTime() &&
              endDate.getTime() === fyEnd.getTime()
            ) {
              params.FinancialYear = financialYearLabel;
            }
          }

          // Fetch and format data
          await this._fetchCommonData("MSADetails", "MSADisplayModel", params);
          const oModel = this.getView().getModel("MSADisplayModel");
          const aData = oModel.getData();
          aData.forEach((item) => {
            if (item.CreateMSADate) {
              item.CreateMSADate = this.Formatter.formatDate(
                item.CreateMSADate
              );
            }
          });
          oModel.setData(aData);
          this.closeBusyDialog();
        } catch (error) {
          this.closeBusyDialog();
          MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
        }
      },
      MSA_DownloadTableData: function () {
        var table = this.byId("MSA_id_Table");
        const oModelData = table.getModel("MSADisplayModel").getData();
        const aFormattedData = oModelData.map((item) => {
          return {
            ...item,
            MsaContractPeriodEndDate: Formatter.formatDate(
              item.MsaContractPeriodEndDate
            ),
          };
        });
        const aCols = [
          {
            label: this.i18nModel.getText("companyName"),
            property: "CompanyName",
            type: "string",
          },
          {
            label: this.i18nModel.getText("companyHeadName"),
            property: "CompanyHeadName",
            type: "string",
          },
          {
            label: this.i18nModel.getText("companyHeadPosition"),
            property: "CompanyHeadPosition",
            type: "string",
          },
          {
            label: this.i18nModel.getText("paymentterms"),
            property: "PaymentTerms",
            type: "string",
          },
          {
            label: this.i18nModel.getText("msaEndDate"),
            property: "MsaContractPeriodEndDate",
            type: "string",
          },
          {
            label: this.i18nModel.getText("PayByDate"),
            property: "PayByDate",
            type: "string ",
          },
          {
            label: this.i18nModel.getText("type"),
            property: "Type",
            type: "string",
          },
        ];
        const oSettings = {
          workbook: {
            columns: aCols,
            context: {
              sheetName: this.i18nModel.getText("invoiceapp"),
            },
          },
          dataSource: aFormattedData,
          fileName: "MSADetails.xlsx",
        };
        const oSheet = new Spreadsheet(oSettings);
        oSheet
          .build()
          .then(
            function () {
              MessageToast.show(this.i18nModel.getText("downloadsuccessfully"));
            }.bind(this)
          )
          .finally(function () {
            oSheet.destroy();
          });
      },

      MSA_Email: function () {
        const oView = this.getView();
        if (!this._oMailDialog) {
          this._oMailDialog = sap.ui.xmlfragment(
            oView.getId(),
            "sap.kt.com.minihrsolution.fragment.emailMSA",
            this
          );
          oView.addDependent(this._oMailDialog);
        }

        const sCustomerName = this.byId("MSA_id_CompanyName").getValue();
        const sMailBodyTemplate = this.getI18nText("mailBodyTemplate");
        const sFormattedBody = sMailBodyTemplate
          .replace(/{Customer Name}/g, sCustomerName)
          .replace(/\n\n/g, "</p><p>")
          .replace(/\n/g, "<br/>")
          .replace(/Dear/g, "<strong>Dear</strong>")
          .replace(
            /Master Services Agreement \(MSA\)/g,
            "<strong>Master Services Agreement (MSA)</strong>"
          )
          .replace(/PAN No/g, "<strong>PAN No</strong>")
          .replace(/Email address/g, "<strong>Email address</strong>");

        const sFinalHtml = `<p>${sFormattedBody}</p>`;

        const oMailModel = new JSONModel({
          to: "",
          body: sFinalHtml,
        });
        oView.setModel(oMailModel, "MSAEmailModel");

        this._oMailDialog.open();
      },

      onLiveChangeEmail: function (oEvent) {
        validation._LCvalidateEmail(oEvent.getSource(), "ID");
      },

      _validateMandatoryField: function (oControl) {
        const sValue = oControl.getValue()?.trim();
        if (!sValue) {
          oControl.setValueState("Error");
          return false;
        } else {
          oControl.setValueState("None");
          return true;
        }
      },

      _validateInOrder: function (aChecks) {
        for (const { ctrl, fn } of aChecks) {
          const bIsValid = fn(ctrl, "ID");
          if (!bIsValid) {
            if (typeof ctrl.focus === "function") {
              ctrl.focus();
            }
            return false;
          }
        }
        return true;
      },

      onSendMail: async function () {
        const oView = this.getView();
        this.i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
        const mandatoryText = this.i18n.getText("mandetoryFields");
        const emailSuccess = this.i18n.getText("emailSuccess");

        const aValidationChecks = [
          { ctrl: oView.byId("idEmailTo"), fn: validation._LCvalidateEmail },
          { ctrl: oView.byId("idEmailBody"), fn: this._validateRTE.bind(this) },
        ];

        const bFormIsValid = this._validateInOrder(aValidationChecks);

        if (!bFormIsValid) {
          MessageToast.show(mandatoryText);
          return;
        }

        this.getBusyDialog();
        const oMailModel = oView.getModel("MSAEmailModel");
        const oPayload = {
          Type: "MSADetails",
          toEmailID: oMailModel.getProperty("/to"),
          body: oMailModel.getProperty("/body"),
        };
        try {
         this.ajaxCreateWithJQuery("MSAEmail", oPayload).then((oData) => {
          MessageToast.show(this.i18nModel.getText("emailSuccess"));
           this._oMailDialog.close();
           this.closeBusyDialog();
          });
        } catch (oError) {
            MessageToast.show(oError.responseText);
            this.closeBusyDialog();
        } finally {
          this.closeBusyDialog();
        }
      },

      onCancelMail: function () {
        if (this._oMailDialog) {
          this._oMailDialog.close();

          this._oMailDialog.destroy();

          this._oMailDialog = null;
        }
      },

      onRTEChange: function (oEvent) {
        const oRTE = oEvent.getSource();
        this._validateRTE(oRTE);
      },

      _validateRTE: function (oRTE) {
        const sRTEValue = oRTE.getValue();

        const iRTELength = sRTEValue.replace(/<[^>]*>/g, "").trim().length;

        if (iRTELength < 8) {
          oRTE.addStyleClass("sapUiRTEErrorBorder");
          return false;
        } else {
          oRTE.removeStyleClass("sapUiRTEErrorBorder");
          return true;
        }
      },
    });
  }
);
