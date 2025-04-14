sap.ui.define(
  ["./BaseController", "sap/m/MessageToast", "sap/ui/core/BusyIndicator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem"],
  (Controller, MessageToast, BusyIndicator, MessagePopover, MessageItem) => {
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
        this.oView = this.getView();
        this.oCore = sap.ui.getCore();
        this.oLoginModel = oView.getModel("LoginModel");
        this.oModel = oView.getModel("Payroll");
        this.i18nModel = oView.getModel("i18n").getResourceBundle();
        this._FragmentDatePickersReadOnly(["FST_id_MonthYearPicker", "FST_id_FilterBranch"]);

        if (!oLoginModel) {
          this.getRouter().navTo("RouteLoginPage");
          return;
        }
        oCore.byId("FST_id_FilterBranch").setSelectedKey(oLoginModel.getProperty("/city"));
        this.getView().getModel("LoginModel").setProperty("/HeaderName", "Manage Payroll Data");
        oModel.setProperty("/ShowOnGenerate", false);
        oModel.setProperty("/ShowOnPayroll", true);
        oModel.setProperty("/TableData", null);
        this.resetColumnHeaders();
        oModel.setProperty("/isSELVisible", false);
        this.getView().byId("MP_id_UpdateSalBtn").setEnabled(true);
        oCore.byId("FST_id_MonthYearPicker").setValue("");
        var aData = oModel.getProperty("/TableData");
        oModel.setProperty("/TableRowCount", aData ? aData.length : 0);
        var oBinding = oModel.bindList("/TableData");
        oBinding.attachChange(function () {
          oModel.setProperty("/TableRowCount", oBinding.getLength());
        });

        this._fetchCommonData("BaseLocation", "oBranchModel", {}, ["FST_id_FilterBranch"]);
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
        oModel.setProperty("/isExcelMismatch", false);
        var branch = oCore.byId("FST_id_FilterBranch").getValue();
        var oDate = oCore.byId("FST_id_MonthYearPicker").getDateValue();
        var pickerMonth = String(oDate.getMonth() + 1).padStart(2, '0');
        var pickerYear = String(oDate.getFullYear());
        this.updateDaysInColumns(pickerYear, pickerMonth);
        oModel.setProperty("/FilterBranch", branch);
        oModel.setProperty("/FilterMonth", pickerMonth);
        oModel.setProperty("/FilterYear", pickerYear);
        this._fetchCommonData("PayRoll", "oPayrollModel", { Branch: branch, Month: pickerMonth, Year: pickerYear }, []);
        var oData = oModel.getProperty("/oPayrollModel");
        if (!oData || oData.length === 0) {
          BusyIndicator.hide();
          MessageToast.show(this.i18nModel.getText("msgDataNotExistsInDB"));
          oModel.setProperty("/TableData", null);
          this.resetColumnHeaders();
          oModel.setProperty("/isSELVisible", false);
        }
        else {
          this._sortAndFormatRecords(oData);
        }
      },

      _sortAndFormatRecords: function (records) {
        records.sort((a, b) => (parseInt(a["EmployeeID"], 10) || 0) - (parseInt(b["EmployeeID"], 10) || 0));
        records = records.map(record => {
          return {
            "Company": record["Company"] ? record["Company"].toString() : "",
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
        oModel.setProperty("/TableData", records);
        oModel.setProperty("/isSELVisible", true);
        oView.byId("MP_id_UpdateSalBtn").setEnabled(true);
        oView.byId("MP_id_DeleteBtn").setEnabled(true);
        BusyIndicator.hide();
      },

      MP_onPressSalUpdate: function (e) {
        BusyIndicator.show(0);
        var file = e.getParameter("files") && e.getParameter("files")[0];
        if (file) {
          var reader = new FileReader();
          var payrollData = oModel.getProperty("/TableData");
          reader.onload = (e) => {
            var data = e.target.result;
            var workbook = XLSX.read(data, { type: "binary" });
            var sheetName = workbook.SheetNames[0];
            var sheetData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
            var isMismatch = sheetData.some(row => {
              var company = row["Company"] || "";
              var branch = row["Branch"] || "";
              var month = row["Month"] || "";
              var year = row["Year"] || "";
              var empCode = row["EmployeeID"] || "";
              var actualPay = row["ActualPay"] || "";
              var uploadedBy = row["UploadedBy"] || "";
              var matchingRecord = payrollData.find(record =>
                record["Company"] === company &&
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
              row["ChangedBy"] = oLoginModel.getProperty("/EmployeeName");
              return row;
            });
            this._updateData(sheetData);
          };
          reader.onerror = () => {
            MessageToast.show(this.i18nModel.getText("quoSchemefailedtofetch"));
            BusyIndicator.hide();
          };
          reader.readAsBinaryString(file);
        }
      },

      _updateData: async function (sheetData) {
        var response = await this.ajaxUpdateWithJQuery("PayRoll", {
          data: JSON.stringify(sheetData),
        });
        if (response.success) {
          oModel.setProperty("/TableData", sheetData);
          oView.byId("MP_id_UpdateSalBtn").setEnabled(false);
          MessageToast.show(this.i18nModel.getText("msgSalUploadSuccess"));
        } else {
          MessageToast.show(this.i18nModel.getText("msgSchemeUploadFailed"));
        }
      },

      onPressExport: function () {
        var branch = oModel.getProperty("/FilterBranch");
        var month = oModel.getProperty("/FilterMonth");
        var year = oModel.getProperty("/FilterYear");
        const aData = oModel.getProperty("/TableData");
        var worksheet = XLSX.utils.json_to_sheet(aData);
        var workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${branch} Salary Data ${month}-${year}.xlsx`);
      },

      onPressDelete: function () {
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
                text: that.i18nModel.getText("ok"),
                type: "Accept",
                press: async function () {
                  that._oWarningDialog.close();
                  await that.ajaxDeleteWithJQuery("Payroll", { filters: { Company: oModel.getProperty("/FilterCompany"), Branch: oModel.getProperty("/FilterBranch"), Month: oModel.getProperty("/FilterMonth"), Year: oModel.getProperty("/FilterYear") } });
                  if (response.success) {
                    oModel.setProperty("/TableData", null);
                    that.resetColumnHeaders();
                    oModel.setProperty("/isSELVisible", false);
                    MessageToast.show(that.i18nModel.getText("hikeDelete"));
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
