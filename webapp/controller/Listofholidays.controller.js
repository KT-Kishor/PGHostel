sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel", //json model
    "../model/formatter",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
  ],
  function (BaseController, JSONModel, Formatter, Spreadsheet, MessageToast) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.Listofholidays",
      {
        Formatter: Formatter,
        onInit: function () {
          this.getRouter().getRoute("RouteListofholidays").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
          this.byId("LOH_id_Holidays").setValue(new Date().getFullYear());
          this._fetchCommonData("ListOfHolidays?", "HolidayModel", { startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-31`, });
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("headerListOfHolidays"));
        },

        onSearch: function () {
          var selectedYear = this.byId("LOH_id_Holidays").getValue();
          if (!selectedYear) return MessageToast.show(this.i18nModel.getText("selectionYear"));
          this.byId("LOH_id_Holidays").setValue(selectedYear);
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
          sap.ui.getCore().byId("ALH_id_Date").setValue("");
          sap.ui.getCore().byId("ALH_id_LocFileUpload").clear();
          sap.ui.getCore().byId("ALH_id_LocFileUpload").setEnabled(false);
          sap.ui.getCore().byId("ALH_id_SubmitButton").setEnabled(false);
        },

        handleChange: function (oEvent) {
          var selectedYear = oEvent.getSource().getValue();
          if (selectedYear) {
            sap.ui.getCore().byId("ALH_id_LocFileUpload").setEnabled(true); // Enable file uploader
          } else {
            sap.ui.getCore().byId("ALH_id_LocFileUpload").setEnabled(false);
          }
        },

        LOH_onUpload: function (e) {
          var file = e.getParameter("files") && e.getParameter("files")[0];
          if (file) {
            sap.ui.getCore().byId("ALH_id_SubmitButton").setEnabled(true); // Enable Submit Button
          } else {
            sap.ui.getCore().byId("ALH_id_SubmitButton").setEnabled(false); // Disable Submit Button
          }
        },

        LOH_onPressSubmit: async function () {
          var that = this;
          var oFileUploader = sap.ui.getCore().byId("ALH_id_LocFileUpload");
          var aFiles = oFileUploader.oFileUpload.files;
          if (!aFiles.length) {
            MessageToast.show("Please select a file to upload.");
            return;
          }

          var oFile = aFiles[0];
          var reader = new FileReader();
          var selectedYear = sap.ui.getCore().byId("ALH_id_Date").getValue();

          if (!selectedYear) {
            MessageToast.show(this.i18nModel.getText("selectionYear"));
            return;
          }

          reader.onload = async (e) => {
            var data = e.target.result;
            var workbook = XLSX.read(data, { type: "binary" });
            var sheetName = workbook.SheetNames[0];
            var excelData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

            if (!excelData.length) {
              MessageToast.show(this.i18nModel.getText("noDatainFile"));
              return;
            }

            var formattedData = excelData.map((item) => ({
              Name: item.Name,
              Date: new Date(item.Date).toISOString().split("T")[0], 
              Day: item.Day,
              Karnataka: item.Karnataka,
              OtherStates: item.OtherStates,
              Maharashtra: item.Maharashtra,
              Delhi: item.Delhi,
          }));

          var existingData= await this.ajaxReadWithJQuery("ListOfHolidays?", { startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-12-31`, });
            
            if (existingData) {
              sap.m.MessageBox.confirm(
                `Previous data for ${selectedYear} will be deleted. Do you want to continue?`, {
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                onClose: async (sAction) => {
                  if (sAction === sap.m.MessageBox.Action.YES) {
                    await that.ajaxDeleteWithJQuery("ListOfHolidays", { startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-12-31`, });
                    await that.ajaxCreateWithJQuery("ListOfHolidays", { data: formattedData });
                    MessageToast.show(that.i18nModel.getText("uploadSuccessfull"));
                    that.oDialog.close();
                  }
                }
              }
              );
            } else {
              await this.ajaxCreateWithJQuery("ListOfHolidays", { data: formattedData });
              MessageToast.show(that.i18nModel.getText("uploadSuccessfull"));
              that.oDialog.close();
            }
          };
          reader.readAsBinaryString(oFile);
        },

        createColumnConfig: function () {
          return [
            { label: "Name", property: "Name", type: "string" },
            { label: "Date", property: "Date", type: "date" },
            { label: "Day", property: "Day", type: "string" },
            { label: "Karnataka", property: "Karnataka", type: "string" },
            { label: "OtherStates", property: "OtherStates", type: "string" },
            { label: "Maharashtra", property: "Maharashtra", type: "string" },
            { label: "Delhi", property: "Delhi", type: "string" },
          ];
        },

        LOH_onExport: function () {
          const oModel = this.byId("LOH_id_HolidayTable").getModel("HolidayModel").getData();

          if (!oModel || oModel.length === 0) {
            MessageToast.show(that.i18nModel.getText("noData"));
            return;
          }

          const aCols = this.createColumnConfig();
          const oSettings = {
            workbook: { columns: aCols, hierarchyLevel: "Level", },
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
          this.getOwnerComponent().getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
          this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
        },
      }
    );
  }
);
