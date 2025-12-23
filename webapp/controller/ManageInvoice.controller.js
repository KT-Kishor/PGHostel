sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    'sap/ui/export/Spreadsheet',
    "../model/formatter",
  ],
  function (BaseController, MessageToast, Spreadsheet, Formatter) {
    "use strict";
    return BaseController.extend(
      "sap.ui.com.project1.controller.ManageInvoice",
      {
        Formatter: Formatter,
        onInit: function () {
          this.getOwnerComponent().getRouter().getRoute("RouteManageInvoice").attachMatched(this._onRouteMatched, this);
        },

         _onRouteMatched: async function() {
            try {
               this.commonLoginFunction();
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this._isClearPressed = false; // ensure full data is not requested'
                const currentYear = new Date().getFullYear();
                let fyStart, fyEnd;

                if (new Date().getMonth() >= 3) {
                    fyStart = new Date(currentYear, 3, 1); // April 1
                    fyEnd = new Date(currentYear + 1, 2, 31); // March 31 next year
                } else {
                    fyStart = new Date(currentYear - 1, 3, 1); // April 1 last year
                    fyEnd = new Date(currentYear, 2, 31); // March 31 this year
                }
                // Set the date range UI (override user-selected values)
                const dateRangeControl = this.byId("CI_id_InvoiceDatePicker");
                if (dateRangeControl) {
                    dateRangeControl.setDateValue(fyStart);
                    dateRangeControl.setSecondDateValue(fyEnd);
                }
                await this.ManageInvoice_onSearch();
              
            } catch (error) {
                sap.ui.core.BusyIndicator.hide();
                MessageToast.show(error.message || error.responseText);
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        ManageInvoice_onSearch: async function () {
          try {
           sap.ui.core.BusyIndicator.show(0);
            const filterItems = this.byId("CI_id_InvoiceFilterBar").getFilterGroupItems();
            const params = {};

            let invoiceDateProvided = false;

            // Extract values from filter bar
            filterItems.forEach((item) => {
              const control = item.getControl();
              const key = item.getName();

              if (control && typeof control.getValue === "function") {
                const value = control.getValue().trim();

                if (key === "InvoiceDate" && value.includes("-")) {
                  const [start, end] = value.split("-").map(date =>
                    date.trim().split("/").reverse().join("-")
                  );
                  params.InvoiceStartDate = start;
                  params.InvoiceEndDate = end;
                  invoiceDateProvided = true;
                } else {
                  params[key] = value;
                }
              }
            });

            const currentYear = new Date().getFullYear();
          
            let fyStart, fyEnd, financialYearLabel;
            if (new Date().getMonth() >= 3) { // April or later
              fyStart = new Date(currentYear, 3, 1); // April 1st
              fyEnd = new Date(currentYear + 1, 2, 31); // March 31st next year
              financialYearLabel = `${currentYear}-${currentYear + 1}`;
            } else {
              fyStart = new Date(currentYear - 1, 3, 1); // April 1st last year
              fyEnd = new Date(currentYear, 2, 31); // March 31st this year
              financialYearLabel = `${currentYear - 1}-${currentYear}`;
            }

            const formatDate = (date) => date.toISOString().split("T")[0];

            // Check if clear button was pressed
                    if (this._isClearPressed) {
                        // fetch all data, no filters
                        delete params.StartDate;
                        delete params.EndDate;
                        delete params.FinancialYear;
                        this._isClearPressed = false; // reset flag
                    } else if (!invoiceDateProvided) {
                        // No date selected by user → apply financial year filter
                        params.StartDate = formatDate(fyStart);
                        params.EndDate = formatDate(fyEnd);
                        params.FinancialYear = financialYearLabel;

                        const dateRangeControl = this.byId("CI_id_InvoiceDatePicker");
                        if (dateRangeControl) {
                            dateRangeControl.setDateValue(fyStart);
                            dateRangeControl.setSecondDateValue(fyEnd);
                        }
                    } else {
                        // Date was selected by user → check if it's financial year
                        const startDate = new Date(params.StartDate);
                        const endDate = new Date(params.EndDate);
                        if (startDate.getTime() === fyStart.getTime() && endDate.getTime() === fyEnd.getTime()) {
                            params.FinancialYear = financialYearLabel;
                        }
                    }
            // Fetch data
            this._fetchCommonData("HM_ManageInvoice", "ManageInvoiceFilterModel", { InvoiceStartDate: params.InvoiceStartDate, InvoiceEndDate: params.InvoiceEndDate });
            await this._fetchCommonData("HM_ManageInvoice", "ManageInvoiceModel", params);
            const aInvoiceData = this.getView().getModel("ManageInvoiceModel").getData();
            this._buildUniqueCustomerModel(aInvoiceData);
            sap.ui.core.BusyIndicator.hide();
          } catch (error) {
            sap.ui.core.BusyIndicator.hide();
            MessageToast.show(this.i18nModel.getText("technicalError"));
          }
        },

        _buildUniqueCustomerModel: function (aInvoices) {
            const oMap = {};
            const aUniqueCustomers = [];

            aInvoices.forEach(oItem => {
                if (!oMap[oItem.CustomerID]) {
                    oMap[oItem.CustomerID] = true;
                    aUniqueCustomers.push({
                        CustomerID: oItem.CustomerID,
                        CustomerName: oItem.CustomerName
                    });
                }
            });

            const oModel = new sap.ui.model.json.JSONModel(aUniqueCustomers);
            this.getView().setModel(oModel, "CustomerFilterModel");
        },

        onPressClear: function () {
          this.byId("CI_id_InvNo").setValue("");
          this.byId("CI_id_InvoiceDatePicker").setValue("");
          this.byId("CI_id_CustomerNameComboBox").setValue("");
          this.byId("CI_id_StatusComboBox").setValue("");
          this._isClearPressed = true;
        },

        onSelectionChange: function (oEvent) {
          this.data = oEvent.getSource().getSelectedItem().getBindingContext("ManageInvoiceModel").getObject();
          if (this.data.Status === "Submitted") {
            this.byId("CI_InvoiceDelete").setEnabled(true);
          } else {
            this.byId("CI_InvoiceDelete").setEnabled(false);
          }
        },

        CI_OnPressDeleteInvoice: function () {
          var that = this;
          this.showConfirmationDialog(
            that.i18nModel.getText("msgBoxConfirm"),
            that.i18nModel.getText("msgBoxConfirmDelete"),
            async function () {
              that.getBusyDialog();
              try {
                await that.ajaxDeleteWithJQuery("/HM_ManageInvoice", { filters: { InvNo: that.data.InvNo } });
                MessageToast.show(that.i18nModel.getText("CompanyDeleteMess"));
                that.ManageInvoice_onSearch();
              } catch (error) {
                MessageToast.show(error.responseText || "Error deleting expense");
              } finally {
                that.closeBusyDialog();
              }
            },
            function () { that.closeBusyDialog(); })
        },


        CI_onPressAddInvoice: function () {
          this.getOwnerComponent().getRouter().navTo("RouteManageInvoiceDetails", { sPath: "X" ,dash:"ManageInvoice"});
        },
        

        CI_onPressInvoiceRow: function (oEvent) {
          this.getOwnerComponent().getRouter().navTo("RouteManageInvoiceDetails", { sPath: encodeURIComponent(oEvent.getSource().getBindingContext("ManageInvoiceModel").getObject().InvNo), dash:"ManageInvoice" });
        },

        onNavBack: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("TilePage");
        },

        onHome: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },
        
        CI_onPressDownload: function () {
          var table = this.byId("CI_id_InvoiceTable");
          const oModelData = table.getModel("ManageInvoiceModel").getData();
          const aFormattedData = oModelData.map(item => {
            return {
              ...item,
              InvoiceDate: Formatter.formatDate(item.InvoiceDate),
              PayByDate: Formatter.formatDate(item.PayByDate),
              TotalAmountCurrency: item.TotalAmount + " " + item.Currency
              
            };
          });
          const aCols = [
            { label: this.i18nModel.getText("invoiceNo"), property: "InvNo", type: "string" },
            { label: this.i18nModel.getText("customerName"), property: "CustomerName", type: "string" },
            { label: this.i18nModel.getText("customerID"), property: "CustomerID", type: "string" },
            { label: this.i18nModel.getText("bookingID"), property: "BookingID", type: "string" },
            { label: this.i18nModel.getText("invoiceDate"), property: "InvoiceDate", type: "string" },
            { label: this.i18nModel.getText("invoiceDescription"), property: "InvoiceDescription", type: "string" },
            { label: this.i18nModel.getText("totalAmount"), property: "TotalAmountCurrency", type: "string" },
            { label: this.i18nModel.getText("PayByDate"), property: "PayByDate", type: "string " },
            { label: this.i18nModel.getText("status"), property: "Status", type: "string" },
            { label: this.i18nModel.getText("cgs"), property: "CGST", type: "string" },
            { label: this.i18nModel.getText("sgst"), property: "SGST", type: "string" },
            { label: this.i18nModel.getText("igst"), property: "IGST", type: "string " },
            { label: this.i18nModel.getText("amountInINR"), property: "AmountInINR", type: "string" },
          ];
          const oSettings = {
            workbook: {
              columns: aCols,
              context: {
                sheetName: this.i18nModel.getText("invoiceapp")
              }
            },
            dataSource: aFormattedData,
            fileName: "ManageInvoice.xlsx"
          };
          const oSheet = new Spreadsheet(oSettings);
          oSheet.build().then(function () {
            MessageToast.show(this.i18nModel.getText("downloadsuccessfully"));
          }.bind(this))
            .finally(function () {
              oSheet.destroy();
            });

        }
      }
    );
  }
);