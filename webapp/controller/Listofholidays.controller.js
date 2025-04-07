sap.ui.define(
  [
    "./BaseController", //call base controller
    "../model/formatter",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  function (BaseController, Formatter, Spreadsheet, MessageToast, MessageBox) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.Listofholidays",
      {
        Formatter: Formatter,
        onInit: function () {
          this.getRouter()
            .getRoute("RouteListofholidays")
            .attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
          this.byId("LOH_id_Holidays").setValue(new Date().getFullYear());
          this._makeDatePickersReadOnly(["LOH_id_Holidays"]);
          this._fetchCommonData("ListOfHolidays?", "HolidayModel", {
            startDate: `${new Date().getFullYear()}-01-01`,
            endDate: `${new Date().getFullYear()}-12-31`,
          });
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getView()
            .getModel("LoginModel")
            .setProperty(
              "/HeaderName",
              this.i18nModel.getText("headerListOfHolidays")
            );
        },

        onSearch: function () {
          var selectedYear = this.byId("LOH_id_Holidays").getValue();
          this._fetchCommonData("ListOfHolidays?", "HolidayModel", {
            startDate: `${selectedYear}-01-01`,
            endDate: `${selectedYear}-12-31`,
          });
        },

        LOH_onOpenImport: function () {
          var that = this;
          if (!this.oDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.AddHolidayList",
              controller: this,
            }).then(function (oDialog) {
              that.oDialog = oDialog;
              that.getView().addDependent(that.oDialog);
              that._resetDialogFields(); // Reset values
              that.oDialog.open();
            });
          } else {
            this._resetDialogFields(); // Reset values
            this.oDialog.open();
          }
        },

        LOH_onPressClose: function () {
          this._resetDialogFields(); // Reset values
          this.oDialog.close();
        },

        _resetDialogFields: function () {
          sap.ui
            .getCore()
            .byId("ALH_id_Date")
            .setValue(new Date().getFullYear() + 1);
          this._FragmentDatePickersReadOnly(["ALH_id_Date"]);
          sap.ui.getCore().byId("ALH_id_LocFileUpload").clear();
          sap.ui.getCore().byId("ALH_id_SubmitButton").setEnabled(false);
        },

        LOH_onUpload: function (e) {
          var oFileUploader = e.getSource();
          var file = e.getParameter("files") && e.getParameter("files")[0];
          var selectedYear = sap.ui.getCore().byId("ALH_id_Date").getValue();
          var expectedColumns = [
            "Name",
            "Date",
            "Day",
            "Karnataka",
            "OtherStates",
            "Maharashtra",
            "Delhi",
          ];
          var that = this;
          if (!file) {
            sap.ui.getCore().byId("ALH_id_SubmitButton").setEnabled(false);
            return;
          }
          var reader = new FileReader();
          reader.onload = function (event) {
            try {
              var data = new Uint8Array(event.target.result);
              var workbook = XLSX.read(data, { type: "array" });
              var sheetName = workbook.SheetNames[0];
              var sheet = workbook.Sheets[sheetName];
              var excelData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
              if (!excelData.length) {
                MessageToast.show(that.i18nModel.getText("noDatainFile"));
                sap.ui.getCore().byId("ALH_id_SubmitButton").setEnabled(false);
                oFileUploader.clear();
                return;
              }
              var fileHeaders = excelData[0].map((header) => header.trim());
              if (
                !expectedColumns.every(
                  (col, index) => col === fileHeaders[index]
                )
              ) {
                MessageToast.show(
                  that.i18nModel.getText("fileColumnOrderFormat")
                );
                sap.ui.getCore().byId("ALH_id_SubmitButton").setEnabled(false);
                oFileUploader.clear();
                return;
              }

              var invalidData = excelData.slice(1).some((row) => {
                return [3, 4, 5, 6].some(
                  (index) => row[index] !== 0 && row[index] !== 1
                );
              });

              if (invalidData) {
                MessageToast.show(
                  that.i18nModel.getText("InvalidColStateFormat")
                );
                sap.ui.getCore().byId("ALH_id_SubmitButton").setEnabled(false);
                oFileUploader.clear();
                return;
              }
              var invalidYear = excelData.slice(1).some((row) => {
                var dateValue = row[1];
                var jsDate = that.excelDateToJSDate(dateValue);
                var rowYear = jsDate.getFullYear();
                return rowYear !== parseInt(selectedYear, 10);
              });
              if (invalidYear) {
                MessageToast.show(
                  that.i18nModel.getText("IncorrectDataOfExcel")
                );
                sap.ui.getCore().byId("ALH_id_SubmitButton").setEnabled(false);
                oFileUploader.clear();
                return;
              }
              that._uploadedExcelData = excelData;
              sap.ui.getCore().byId("ALH_id_SubmitButton").setEnabled(true);
            } catch (error) {
              MessageToast.show(that.i18nModel.getText("commonErrorMessage"));
              sap.ui.getCore().byId("ALH_id_SubmitButton").setEnabled(false);
              oFileUploader.clear();
            }
          };
          reader.readAsArrayBuffer(file);
        },

        excelDateToJSDate: function (serial) {
          var excelEpoch = new Date(1899, 11, 30); // Excel's base date (Dec 30, 1899)
          return new Date(excelEpoch.getTime() + serial * 86400000); // Convert serial number to date
        },

        LOH_onPressSubmit: async function (oEvent) {
          try {
            var that = this;
            var selectedYear = sap.ui.getCore().byId("ALH_id_Date").getValue();
            if (!this._uploadedExcelData) {
              MessageToast.show(this.i18nModel.getText("noDataToUpload"));
              return;
            }
            var formattedData = this._uploadedExcelData.slice(1).map((row) => ({
              Name: row[0],
              Date: this.excelDateToJSDate(row[1]).toISOString().split("T")[0],
              Day: row[2],
              Karnataka: row[3],
              OtherStates: row[4],
              Maharashtra: row[5],
              Delhi: row[6],
            }));
            var existingData = await this.ajaxReadWithJQuery("ListOfHolidays", {
              startDate: `${selectedYear}-01-01`,
              endDate: `${selectedYear}-12-31`,
            });
            if (existingData.data.length > 0) {
              MessageBox.confirm(
                `Previous data for ${selectedYear} will be deleted. Do you want to continue?`,
                {
                  actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                  onClose: async function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                      await that.ajaxDeleteWithJQuery("ListOfHolidays", {
                        filters: {
                          startDate: `${selectedYear}-01-01`,
                          endDate: `${selectedYear}-12-31`,
                        },
                      });
                      await that.ajaxCreateWithJQuery("ListOfHolidays", {
                        data: formattedData,
                      });
                      MessageToast.show(
                        that.i18nModel.getText("uploadSuccessfull")
                      );
                      that.oDialog.close();
                      that._fetchCommonData("ListOfHolidays?", "HolidayModel", {
                        startDate: `${selectedYear}-01-01`,
                        endDate: `${selectedYear}-12-31`,
                      });
                    }
                  },
                }
              );
            } else {
              await this.ajaxCreateWithJQuery("ListOfHolidays", {
                data: formattedData,
              });
              MessageToast.show(this.i18nModel.getText("uploadSuccessfull"));
              this.oDialog.close();
              this._fetchCommonData("ListOfHolidays?", "HolidayModel", {
                startDate: `${selectedYear}-01-01`,
                endDate: `${selectedYear}-12-31`,
              });
            }
          } catch (error) {
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
          }
        },

        createColumnConfig: function () {
          return [
            { label: "Name", property: "Name", type: "string" },
            { label: "Date", property: "Date", type: "date" },
            { label: "Day", property: "Day", type: "string" },
            { label: "Karnataka", property: "Karnataka", type: "Number" },
            { label: "OtherStates", property: "OtherStates", type: "Number" },
            { label: "Maharashtra", property: "Maharashtra", type: "Number" },
            { label: "Delhi", property: "Delhi", type: "Number" },
          ];
        },

        LOH_onExport: function () {
          const oModel = this.byId("LOH_id_HolidayTable")
            .getModel("HolidayModel")
            .getData();
          if (!oModel || oModel.length === 0) {
            MessageToast.show(that.i18nModel.getText("noData"));
            return;
          }
          const aCols = this.createColumnConfig();
          const oSettings = {
            workbook: { columns: aCols, hierarchyLevel: "Level" },
            dataSource: oModel,
            fileName: "List_Of_Holidays.xlsx",
            worker: false,
          };
          const oSheet = new sap.ui.export.Spreadsheet(oSettings);
          oSheet.build().finally(function () {
            oSheet.destroy();
          });
        },

        onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
          this.getRouter().navTo("RouteLoginPage");
        },
      }
    );
  }
);
