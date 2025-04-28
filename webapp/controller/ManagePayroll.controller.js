sap.ui.define(
  ["./BaseController", "sap/m/MessageToast", "sap/ui/core/BusyIndicator"],
  (Controller, MessageToast, BusyIndicator) => {
    "use strict";

    return Controller.extend("sap.kt.com.minihrsolution.controller.ManagePayroll", {
      onInit: function () {
        this._initMessagePopover();
        this.getRouter().getRoute("RouteManagePayroll").attachMatched(this._onRouteMatched, this);
      },

      MP_onOpenMessagePopover: function (oEvent) {
        this.oMessagePopover.openBy(oEvent.getSource());
      },

      _onRouteMatched: function () {
        this.oLoginModel = this.getView().getModel("LoginModel");
        this.oModel = this.getView().getModel("Payroll");
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

        if (!this.oLoginModel) {
          this.getRouter().navTo("RouteLoginPage");
          return;
        }
        this.byId("FST_id_FilterBranch").setSelectedKey(this.oLoginModel.getProperty("/BranchCode"));
        this.oLoginModel.setProperty("/HeaderName", "Manage Payroll Data");
        this.oModel.setProperty("/ShowOnGenerate", false);
        this.oModel.setProperty("/ShowOnPayroll", true);
        this.oModel.setProperty("/TableData", null);
        this.resetColumnHeaders();
        this.oModel.setProperty("/isSELVisible", false);
        this.getView().byId("MP_id_UpdateSalBtn").setEnabled(true);
        this.byId("FST_id_MonthYearPicker").setValue("");
        var aData = this.oModel.getProperty("/TableData");
        this.oModel.setProperty("/TableRowCount", aData ? aData.length : 0);
        var oBinding = this.oModel.bindList("/TableData");
        oBinding.attachChange(function () {
          this.oModel.setProperty("/TableRowCount", oBinding.getLength());
        });

        this._commonGETCall("BaseLocation", "BaseLocationData", {}, ["FST_id_FilterBranch"]);
        //this.CommonReadcall("GetDepartmentRule", {}, [], "oRuleModel");
        this.FST_onEnableImport();
        BusyIndicator.hide();
      },

      onPressback: function () {
        this.getRouter().navTo("RouteTilePage");
      },

      onLogout: function () {
        this.getRouter().navTo("RouteLoginPage");
      },

      MP_onPressGo: async function () {
        BusyIndicator.show(0);
        this.oModel.setProperty("/isExcelMismatch", false);
        var branch = this.byId("FST_id_FilterBranch").getValue();
        var oDate = this.byId("FST_id_MonthYearPicker").getDateValue();
        var pickerMonth = String(oDate.getMonth() + 1).padStart(2, '0');
        var pickerYear = String(oDate.getFullYear());
        this.updateDaysInColumns(pickerYear, pickerMonth);
        this.oModel.setProperty("/FilterBranch", branch);
        this.oModel.setProperty("/FilterMonth", pickerMonth);
        this.oModel.setProperty("/FilterYear", pickerYear);
        await this._commonGETCall("A_PayRoll", "TableData", { Branch: branch, Month: pickerMonth, Year: pickerYear }, []);
        var oData = this.oModel.getProperty("/TableData");
        if (!oData || oData.length === 0) {
          BusyIndicator.hide();
          MessageToast.show(this.i18nModel.getText("msgDataNotExistsInDB"));
          this.oModel.setProperty("/TableData", null);
          this.resetColumnHeaders();
          this.oModel.setProperty("/isSELVisible", false);
        }
        else {
          this._sortAndFormatRecords(oData);
        }
      },

      _sortAndFormatRecords: function (records) {
        records.sort((a, b) => a["EmployeeID"] - b["EmployeeID"]);
        records = records.map(record => {
          return {
            "Branch": record["Branch"] ? record["Branch"].toString() : "",
            "Month": record["Month"] ? record["Month"].toString() : "",
            "Year": record["Year"] ? record["Year"].toString() : "",
            "EmployeeID": record["EmployeeID"] ? record["EmployeeID"].toString() : "",
            "EmployeeName": record["EmployeeName"] ? record["EmployeeName"].toString() : "",

            "Day1": record["Day1"] ? record["Day1"].toString() : "",
            "Day2": record["Day2"] ? record["Day2"].toString() : "",
            "Day3": record["Day3"] ? record["Day3"].toString() : "",
            "Day4": record["Day4"] ? record["Day4"].toString() : "",
            "Day5": record["Day5"] ? record["Day5"].toString() : "",
            "Day6": record["Day6"] ? record["Day6"].toString() : "",
            "Day7": record["Day7"] ? record["Day7"].toString() : "",
            "Day8": record["Day8"] ? record["Day8"].toString() : "",
            "Day9": record["Day9"] ? record["Day9"].toString() : "",
            "Day10": record["Day10"] ? record["Day10"].toString() : "",
            "Day11": record["Day11"] ? record["Day11"].toString() : "",
            "Day12": record["Day12"] ? record["Day12"].toString() : "",
            "Day13": record["Day13"] ? record["Day13"].toString() : "",
            "Day14": record["Day14"] ? record["Day14"].toString() : "",
            "Day15": record["Day15"] ? record["Day15"].toString() : "",
            "Day16": record["Day16"] ? record["Day16"].toString() : "",
            "Day17": record["Day17"] ? record["Day17"].toString() : "",
            "Day18": record["Day18"] ? record["Day18"].toString() : "",
            "Day19": record["Day19"] ? record["Day19"].toString() : "",
            "Day20": record["Day20"] ? record["Day20"].toString() : "",
            "Day21": record["Day21"] ? record["Day21"].toString() : "",
            "Day22": record["Day22"] ? record["Day22"].toString() : "",
            "Day23": record["Day23"] ? record["Day23"].toString() : "",
            "Day24": record["Day24"] ? record["Day24"].toString() : "",
            "Day25": record["Day25"] ? record["Day25"].toString() : "",
            "Day26": record["Day26"] ? record["Day26"].toString() : "",
            "Day27": record["Day27"] ? record["Day27"].toString() : "",
            "Day28": record["Day28"] ? record["Day28"].toString() : "",
            "Day29": record["Day29"] ? record["Day29"].toString() : "",
            "Day30": record["Day30"] ? record["Day30"].toString() : "",
            "Day31": record["Day31"] ? record["Day31"].toString() : "",

            "TotalDays": record["TotalDays"] ? record["TotalDays"].toString() : "0",
            "TotalPresent": record["TotalPresent"] ? record["TotalPresent"].toString() : "0",
            "TotalAbsent": ((parseInt(record["TotalAbsent"] ? record["TotalAbsent"] : 0)) + (parseInt(record["TotalSunA"] ? record["TotalSunA"] : 0))).toString(),
            "ActualAbsent": record["ActualAbsent"] ? record["ActualAbsent"].toString() : "0",
            "TotalLate": record["TotalLate"] ? record["TotalLate"].toString() : "0",
            "TotalHalf": record["TotalHalf"] ? record["TotalHalf"].toString() : "0",
            "TotalSunP": record["TotalSunP"] ? record["TotalSunP"].toString() : "0",
            "TotalSun": record["TotalSun"] ? record["TotalSun"].toString() : "0",
            "PayDays": record["PayDays"] ? record["PayDays"].toString() : "0",

            "GrossPay": record["GrossPay"] ? record["GrossPay"].toString() : "0",
            "ActualPay": record["ActualPay"] ? record["ActualPay"].toString() : "0",
            "TDS": record["TDS"] ? record["TDS"].toString() : "0",
            "EplyePF": record["EplyePF"] ? record["EplyePF"].toString() : "0",
            "PT": record["PT"] ? record["PT"].toString() : "0",
            "SD": record["SecurityDeposit"] ? record["SecurityDeposit"].toString() : "0",
            "EplyeESI": record["EplyeESI"] ? record["EplyeESI"].toString() : "0",
            "Advance": record["Advance"] ? record["Advance"].toString() : "0",
            "Other": record["Other"] ? record["Other"].toString() : "0",
            "NetPay": record["NetPay"] ? record["NetPay"].toString() : "0",
            "EplyrPF": record["EplyrPF"] ? record["EplyrPF"].toString() : "0",
            "EplyrESI": record["EplyrESI"] ? record["EplyrESI"].toString() : "0",
            "Status": record["Status"] ? record["Status"].toString() : "",
            "UploadedBy": record["UploadedBy"] ? record["UploadedBy"].toString() : "",
            "ChangedBy": record["ChangedBy"] ? record["ChangedBy"].toString() : "",
          };
        });
        this.oModel.setProperty("/TableData", records);
        this.oModel.setProperty("/isSELVisible", true);
        this.getView().byId("MP_id_UpdateSalBtn").setEnabled(true);
        this.getView().byId("MP_id_DeleteBtn").setEnabled(true);
        BusyIndicator.hide();
      },

      MP_onPressSalUpdate: function (e) {
        BusyIndicator.show(0);
        var file = e.getParameter("files") && e.getParameter("files")[0];
        if (file) {
          var reader = new FileReader();
          var payrollData = this.oModel.getProperty("/TableData");
          reader.onload = (e) => {
            var data = e.target.result;
            var workbook = XLSX.read(data, { type: "binary" });
            var sheetName = workbook.SheetNames[0];
            var sheetData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
            var isMismatch = sheetData.some(row => {
              var branch = row["Branch"] || "";
              var month = row["Month"] || "";
              var year = row["Year"] || "";
              var empCode = row["EmployeeID"] || "";
              var actualPay = row["ActualPay"] || "";
              var uploadedBy = row["UploadedBy"] || "";
              var matchingRecord = payrollData.find(record =>
                record["Branch"] === branch &&
                record["Month"] === month &&
                record["Year"] === year &&
                record["EmployeeID"] === empCode &&
                record["ActualPay"] === actualPay &&
                record["UploadedBy"] === uploadedBy
              );
              return !matchingRecord; // Return true if mismatch found
            });
            if (isMismatch) {
              MessageToast.show(this.i18nModel.getText("msgUploadCorrectExcel"));
              BusyIndicator.hide();
              return;
            }
            sheetData = sheetData.map(row => {
              row["Status"] = "Paid";
              row["ChangedBy"] = this.oLoginModel.getProperty("/EmployeeName");
              return row;
            });
            var sheetFilters = sheetData.map(row => ({
              EmployeeID: row["EmployeeID"],
              Month: row["Month"],
              Year: row["Year"]
            }));
            var combinedData = sheetData.map((data, index) => ({
              data: data,
              filters: sheetFilters[index]
            }));
            this._updateData(combinedData);
          };
          reader.onerror = () => {
            MessageToast.show(this.i18nModel.getText("commonReadingDataError"));
            BusyIndicator.hide();
          };
          reader.readAsBinaryString(file);
        }
      },

      _updateData: async function (sheetData, combinedData) {
        try {
          var response = await this.ajaxUpdateWithJQuery("A_PayRoll", { data: combinedData });
          if (response.success) {
            BusyIndicator.hide();
            this.oModel.setProperty("/TableData", sheetData);
            this.getView().byId("MP_id_UpdateSalBtn").setEnabled(false);
            MessageToast.show(this.i18nModel.getText("msgSalUploadSuccess"));
          } else {
            BusyIndicator.hide();
            MessageToast.show(this.i18nModel.getText("msgSchemeUploadFailed"));
          }
        }
        catch (error) {
          MessageToast.show(this.i18nModel.getText("commonError"));
          console.error("Error during update:", error);
          BusyIndicator.hide();
        }
      },

      MP_onPressExport: function () {
        var branch = this.oModel.getProperty("/FilterBranch");
        var month = this.oModel.getProperty("/FilterMonth");
        var year = this.oModel.getProperty("/FilterYear");
        const aData = this.oModel.getProperty("/TableData");
        var worksheet = XLSX.utils.json_to_sheet(aData);
        var workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${branch} Salary Data ${month}-${year}.xlsx`);
      },

      MP_onPressDelete: function () {
        var that = this;
        if (!this._oWarningDialog) {
          this._oWarningDialog = new sap.m.Dialog({
            title: that.i18nModel.getText("warning"),
            type: sap.m.DialogType.Message,
            state: "Warning",
            content: new sap.m.Text({
              text: that.i18nModel.getText("msgConfirmDelSal"),
            }),
            buttons: [
              new sap.m.Button({
                text: that.i18nModel.getText("OkButton"),
                type: "Accept",
                press: async function () {
                  that._oWarningDialog.close();
                  var response = await that.ajaxDeleteWithJQuery("A_Payroll", { filters: { Branch: that.oModel.getProperty("/FilterBranch"), Month: that.oModel.getProperty("/FilterMonth"), Year: that.oModel.getProperty("/FilterYear") } });
                  if (response.success) {
                    that.oModel.setProperty("/TableData", null);
                    that.resetColumnHeaders();
                    that.oModel.setProperty("/isSELVisible", false);
                    MessageToast.show(that.i18nModel.getText("salDeleteSuccess"));
                  } else {
                    MessageToast.show(that.i18nModel.getText("msgSchemeUploadFailed"));
                  }
                },
              }),
              new sap.m.Button({
                text: that.i18nModel.getText("btnCancel"),
                type: "Negative",
                press: function () {
                  that._oWarningDialog.close();
                },
              }),
            ],
          });
          this.getView().addDependent(this._oWarningDialog);
        }
        this._oWarningDialog.open();
      }
    });
  }
);
