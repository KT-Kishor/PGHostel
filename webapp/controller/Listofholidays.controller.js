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
          this.getRouter()
            .getRoute("RouteListofholidays")
            .attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
          this.byId("LOH_id_Holidays").setValue(new Date().getFullYear());
          this._fetchCommonData("ListOfHolidays?", "HolidayModel", {
            startDate: `${new Date().getFullYear()}-01-01`,
            endDate: `${new Date().getFullYear()}-12-31`,
          });
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getView()
            .getModel("LoginModel")
            .setProperty("/HeaderName", "List of Holidays");
        },

        onSearch: function () {
          var that = this;
          var selectedYear = this.byId("LOH_id_Holidays").getValue();
          if (!selectedYear)
            return MessageToast.show(that.i18nModel.getText("selectionYear"));
          this.byId("LOH_id_Holidays").setValue(selectedYear);
          this._fetchCommonData("ListOfHolidays?", "HolidayModel", {
            startDate: `${selectedYear}-01-01`,
            endDate: `${selectedYear}-12-31`,
          });
        },

        onUpload: function () {
          var that = this;
          var oFileUploader = this.byId("LOH_id_LocFileUpload");
          var aFiles = oFileUploader.oFileUpload.files;

          if (!aFiles.length) {
            MessageToast.show(that.i18nModel.getText("selectFile"));
            return;
          }

          var oFile = aFiles[0];
          var reader = new FileReader();

          var selectedYear = this.byId("LOH_id_Holidays").getValue();
          if (!selectedYear) {
            MessageToast.show(that.i18nModel.getText("validYear"));
            return;
          }

          reader.onload = async (e) => {
            var data = e.target.result;
            var workbook = XLSX.read(data, { type: "binary" });
            var sheetName = workbook.SheetNames[0];
            var excelData = XLSX.utils.sheet_to_json(
              workbook.Sheets[sheetName]
            );

            if (!excelData.length) {
              MessageToast.show(that.i18nModel.getText("noDatainFile"));
              return;
            }

            var isValidYear = excelData.every((item) => {
              if (item.Date) {
                var excelDate = new Date(item.Date);
                var excelYear = excelDate.getFullYear().toString();
                return excelYear === selectedYear;
              }
              return false;
            });

            if (!isValidYear) {
              MessageToast.show(
                "Uploaded file contains data for a different year. Please upload data for " +
                  selectedYear +
                  "."
              );
              return;
            }

            var formattedData = excelData.map((item) => ({
              Name: item.Name,
              Date: item.Date,
              Day: item.Day,
              Karnataka: item.Karnataka,
              OtherStates: item.OtherStates,
              Maharashtra: item.Maharashtra,
              Delhi: item.Delhi,
            }));

            try {
              await this.ajaxCreateWithJQuery("ListOfHolidays", {
                data: formattedData,
              });
              MessageToast.show(that.i18nModel.getText("uplaodSuccessfull"));
            } catch (error) {
              sap.m.MessageToast.show(
                error.responseJSON?.message || "Error in file upload."
              );
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

        onExport: function () {
          const oModel = this.byId("LOH_id_HolidayTable")
            .getModel("HolidayModel")
            .getData();

          if (!oModel || oModel.length === 0) {
            MessageToast.show(that.i18nModel.getText("noData"));
            return;
          }

          const aCols = this.createColumnConfig();
          const oSettings = {
            workbook: {
              columns: aCols,
              hierarchyLevel: "Level",
            },
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
