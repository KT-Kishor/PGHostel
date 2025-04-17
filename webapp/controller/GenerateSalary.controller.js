sap.ui.define(
  ["./BaseController", "sap/m/MessageToast", "sap/ui/core/BusyIndicator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem"],
  (Controller, MessageToast, BusyIndicator, MessagePopover, MessageItem) => {
    "use strict";

    return Controller.extend("sap.kt.com.minihrsolution.controller.GenerateSalary", {
      onInit: function () {        
        this._initMessagePopover();
        this.getRouter().getRoute("RouteGenerateSalary").attachMatched(this._onRouteMatched, this);
      },

      GS_onOpenMessagePopover: function (oEvent) {
        this.oMessagePopover.openBy(oEvent.getSource());
      },

      _onRouteMatched: function () {
        this.oCore = sap.ui.getCore();
        this.oLoginModel = this.getView().getModel("LoginModel");
        this.oModel = this.getView().getModel("Payroll");
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        this._FragmentDatePickersReadOnly(["FST_id_MonthYearPicker", "FST_id_FilterBranch"]);

        if (!this.oLoginModel) {
          this.getRouter().navTo("RouteLoginPage");
          return;
        }
        this.oCore.byId("FST_id_FilterBranch").setSelectedKey(this.oLoginModel.getProperty("/city"));
        this.oLoginModel.setProperty("/HeaderName", "Generate Salary");
        this.oModel.setProperty("/ShowOnGenerate", true);
        this.oModel.setProperty("/ShowOnPayroll", false);
        this.oModel.setProperty("/TableData", null);
        this.resetColumnHeaders();
        this.oModel.setProperty("/isSELVisible", false);
        this.oCore.byId("FST_id_MonthYearPicker").setValue("");
        var aData = this.oModel.getProperty("/TableData");
        this.oModel.setProperty("/TableRowCount", aData ? aData.length : 0);
        var oBinding = this.oModel.bindList("/TableData");
        oBinding.attachChange(function () {
          this.oModel.setProperty("/TableRowCount", oBinding.getLength());
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

      onUpload: function (e) {
        this.oModel.setProperty("/isExcelMismatch", false);
        var file = e.getParameter("files") && e.getParameter("files")[0];
        if (file) {
          var employeeName = this.oLoginModel.getProperty("/EmployeeName");
          var branch = this.oCore.byId("FST_id_FilterBranch").getValue();
          var oDate = this.oCore.byId("FST_id_MonthYearPicker").getDateValue();
          var pickerMonth = String(oDate.getMonth() + 1).padStart(2, '0');
          var pickerYear = String(oDate.getFullYear());
          this.updateDaysInColumns(pickerYear, pickerMonth);
          var reader = new FileReader();
          var ruleData = this.oModel.getProperty("/oRuleModel");
          var excelMismatch = this.oModel.getProperty("/isExcelMismatch");
          this.oModel.setProperty("/FilterBranch", branch);
          this.oModel.setProperty("/FilterMonth", pickerMonth);
          this.oModel.setProperty("/FilterYear", pickerYear);

          reader.onload = (e) => {
            var data = e.target.result;
            var workbook = XLSX.read(data, { type: "binary" });
            var consolidatedData = {};

            var sheetNames = workbook.SheetNames;
            for (let sheetIndex = 0; sheetIndex < sheetNames.length && sheetIndex < 31 && !excelMismatch; sheetIndex++) {
              var sheetName = sheetNames[sheetIndex];
              var sheetData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName], { range: 6 });

              for (let i = 0; i < sheetData.length; i++) {
                if (excelMismatch) break; // Stop processing further if a mismatch is found

                var row = sheetData[i];
                var empCode = row["Emp Code"];
                var empName = row["Emp Name"];
                var inTime = this._convertTimeToMinutes(row["In Time"]);
                var outTime = this._convertTimeToMinutes(row["Out Time"]);
                var duration = this._convertTimeToMinutes(row["Duration"]);
                var attDate = row["Att. Date"];
                var dateObj = new Date(attDate);
                var dayOfWeek = dateObj.toLocaleString("en-US", { weekday: "long" });
                var year = String(dateObj.getFullYear());
                var month = String(dateObj.getMonth() + 1).padStart(2, '0');
                var totalDays = new Date(year, month, 0).getDate();

                if (month != pickerMonth || year != pickerYear) {
                  MessageToast.show(this.i18nModel.getText("msgUploadCorrectExcel"));
                  this.oModel.setProperty("/isExcelMismatch", true);
                  this.oModel.setProperty("/TableData", null);
                  this.resetColumnHeaders();
                  this.oModel.setProperty("/isSELVisible", false);
                  BusyIndicator.hide();
                  return;
                }

                let checkWeek = (dayOfWeek === "Sunday") ? "FALSE" : "TRUE";
                var day = sheetIndex + 1;

                if (!consolidatedData[empCode]) {
                  consolidatedData[empCode] = {
                    Branch: branch,
                    Month: pickerMonth,
                    Year: pickerYear,
                    EmpCode: empCode,
                    EmpName: empName,
                    TotalDays: totalDays,
                    TotalPresent: 0,
                    TotalAbsent: 0,
                    ActualAbsent: 0,
                    TotalSunA: 0,
                    TotalLate: 0,
                    TotalHalf: 0,
                    TotalSunP: 0,
                    TotalSun: 0,
                    PayDays: 0,
                    GrossPay: 0,
                    ActualPay: 0,
                    TDS: 0,
                    EplyePF: 0,
                    EplyrPF: 0,
                    PT: 0,
                    SecurityDeposit: 0,
                    EplyeESI: 0,
                    EplyrESI: 0,
                    Advance: 0,
                    Other: 0,
                    NetPay: 0,
                    Status: "Saved",
                    UploadedBy: employeeName,
                    ChangedBy: ""
                  };
                }

                var empRuleFilter = ruleData.filter(rule =>
                  parseInt(rule.EmployeeID, 10) === parseInt(empCode, 10) && rule.WeekDays === checkWeek
                );
                var empRule = empRuleFilter.length > 0 ? empRuleFilter[0] : null;

                // **Check if EmployeeID is missing in ruleData**
                if (!empRule) {
                  var isEmpCodeMissing = !ruleData.some(rule => parseInt(rule.EmployeeID, 10) === parseInt(empCode, 10));

                  if (isEmpCodeMissing) {
                    MessageToast.show(`Employee ID: ${empCode} not found in the database. Please check and try again.`);
                  } else {
                    MessageToast.show(this.i18nModel.getText("msgUploadCorrectExcel"));
                  }

                  this.oModel.setProperty("/isExcelMismatch", true);
                  this.oModel.setProperty("/TableData", null);
                  this.resetColumnHeaders();
                  this.oModel.setProperty("/isSELVisible", false);
                  BusyIndicator.hide();
                  return; // Exit the entire function
                }

                let attendanceStatus;
                var checkInRule = this._convertTimeToMinutes(empRule.CheckIn) + parseInt(empRule.Grace);
                var checkOutRule = this._convertTimeToMinutes(empRule.CheckOut);

                if (dayOfWeek === "Sunday") {
                  if (duration < 240 || !inTime || !outTime) {
                    if (consolidatedData[empCode].TotalSunA < 2) {
                      attendanceStatus = "SL";
                    } else {
                      attendanceStatus = "SA";
                      consolidatedData[empCode].ActualAbsent++;
                    }
                    consolidatedData[empCode].TotalSunA++;
                  } else if (inTime > 690 || duration < 300) {
                    attendanceStatus = "SH";
                    consolidatedData[empCode].TotalHalf++;
                    consolidatedData[empCode].TotalSunP++;
                  } else if (inTime > checkInRule || outTime < checkOutRule) {
                    attendanceStatus = "SLA";
                    consolidatedData[empCode].TotalLate++;
                    consolidatedData[empCode].TotalSunP++;
                  } else {
                    attendanceStatus = "SP";
                    consolidatedData[empCode].TotalPresent++;
                    consolidatedData[empCode].TotalSunP++;
                  }
                  consolidatedData[empCode].TotalSun++;
                } else {
                  if (duration < 240 || !inTime || !outTime) {
                    if (consolidatedData[empCode].TotalAbsent < 2) {
                      attendanceStatus = "L";
                    } else {
                      attendanceStatus = "A";
                      consolidatedData[empCode].ActualAbsent++;
                    }
                    consolidatedData[empCode].TotalAbsent++;
                  } else if (inTime > 690 || duration < 300) {
                    attendanceStatus = "H";
                    consolidatedData[empCode].TotalHalf++;
                  } else if (inTime > checkInRule || outTime < checkOutRule) {
                    attendanceStatus = "LA";
                    consolidatedData[empCode].TotalLate++;
                  } else {
                    attendanceStatus = "P";
                    consolidatedData[empCode].TotalPresent++;
                  }
                }

                consolidatedData[empCode][day] = attendanceStatus;
              }
            }

            var records = Object.values(consolidatedData);
            this._salaryCalculation(records);
          };

          reader.onerror = () => {
            MessageToast.show(this.i18nModel.getText("quoSchemefailedtofetch"));
            BusyIndicator.hide();
          };

          reader.readAsBinaryString(file);
        }
      },

      _salaryCalculation: async function (records) {
        var month = this.oModel.getProperty("/FilterMonth");
        var year = this.oModel.getProperty("/FilterYear");
        records.forEach(record => {
          var payDays = (record.TotalPresent + record.TotalLate + (record.TotalHalf / 2) + record.TotalAbsent + record.TotalSunA)
            - (parseInt((record.TotalLate / 3)) * 0.5);

          if (record.TotalAbsent > 2) {
            payDays -= record.TotalAbsent - 2;
          }
          if (record.TotalSunA > 2) {
            payDays -= record.TotalSunA - 2;
          }
          var tAbsent = record.TotalAbsent + record.TotalSunA;
          if (tAbsent < 3) {
            payDays += 1;
          }

          record.PayDays = parseFloat(payDays.toFixed(2));
        });

        var employeeCodes = encodeURIComponent(JSON.stringify(records.map(record => record["EmpCode"])));
        await this._fetchCommonData("SalaryDetailsFunction", "oEmpSalaryModel", { Month: month, Year: year, EmployeeID: employeeCodes }, []);
        var empSalaryData = this.oModel.getProperty("/oEmpSalaryModel");
        for (let i = 0; i < records.length; i++) {
          let record = records[i];

          // Filter salary details for the employee
          let empSal = empSalaryData.find(sal => parseInt(sal.EmployeeID, 10) === record.EmpCode);

          // **Check if Employee Salary is found**
          if (!empSal) {
            this.oModel.setProperty("/isExcelMismatch", true);
            this.oModel.setProperty("/Records", null);
            that.resetColumnHeaders();
            this.oModel.setProperty("/isSELVisible", false);
            BusyIndicator.hide();
            let isEmpCodeMissing = !empSalaryData.some(sal => parseInt(sal.EmployeeID, 10) === record.EmpCode);
            if (isEmpCodeMissing) {
              MessageToast.show(`Salary details not found for Employee ID: ${record.EmpCode}. Please check and try again.`);
            } else {
              MessageToast.show("Salary Details not found!!");
            }
            return; // Exit the function early if no salary details found
          }

          // **Salary Calculations**
          record.GrossPay = parseFloat(empSal.MonthTotal) || 0;
          record.ActualPay = parseFloat(((record.GrossPay / record.TotalDays) * record.PayDays).toFixed(2)) || 0;

          // Employee PF calculation with max cap
          record.EplyePF = parseFloat((parseFloat(empSal.MonthBasic) * (12 / 100)).toFixed(2));
          if (record.EplyePF > 1800) {
            record.EplyePF = 1800;
          }

          // Employer PF calculation with max cap
          record.EplyrPF = parseFloat((parseFloat(empSal.MonthBasic) * (13 / 100)).toFixed(2));
          if (record.EplyrPF > 1950) {
            record.EplyrPF = 1950;
          }

          // Professional Tax (PT) based on GrossPay
          if (record.GrossPay >= 25000) {
            record.PT = 200;
          }

          // ESI calculation based on GrossPay condition
          if (record.GrossPay <= 21000) {
            record.EplyeESI = parseFloat((parseFloat(record.GrossPay) * (0.75 / 100)).toFixed(2)) || 0;
            record.EplyrESI = parseFloat((parseFloat(record.GrossPay) * (3.25 / 100)).toFixed(2)) || 0;
          }

          // Final NetPay calculation
          record.NetPay = parseFloat(
            (
              record.ActualPay +
              record.EplyePF -
              record.PT -
              record.TDS +
              record.SecurityDeposit -
              record.EplyeESI -
              record.Advance +
              record.Other
            ).toFixed(2)
          ) || 0;
        }
        this._sortAndFormatRecords(records);
      },

      _sortAndFormatRecords: function (records) {
        records.sort((a, b) => (parseInt(a["EmpCode"], 10) || 0) - (parseInt(b["EmpCode"], 10) || 0));
        records = records.map(record => {
          return {
            "Company": record["Company"] ? record["Company"].toString() : "",
            "Branch": record["Branch"] ? record["Branch"].toString() : "",
            "Month": record["Month"] ? record["Month"].toString() : "",
            "Year": record["Year"] ? record["Year"].toString() : "",
            "EmployeeID": record["EmpCode"] ? record["EmpCode"].toString() : "",
            "EmployeeName": record["EmpName"] ? record["EmpName"].toString() : "",
            ...[...Array(record.TotalDays || 0).keys()].reduce((acc, day) => {
              acc[`Day${day + 1}`] = record[day + 1] ? record[day + 1].toString() : "";
              return acc;
            }, {}),
            "TotalDays": record["TotalDays"] ? record["TotalDays"].toString() : "0",
            "TotalPresent": record["TotalPresent"] ? record["TotalPresent"].toString() : "0",
            "TotalAbsent": ((record["TotalAbsent"] ? record["TotalAbsent"] : 0) + (record["TotalSunA"] ? record["TotalSunA"] : 0)).toString(),
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
        this.getView().byId("GS_id_BtnSave").setEnabled(true);
        BusyIndicator.hide();
      },

      _convertTimeToMinutes: function (timeStr) {
        if (typeof timeStr === "string") {
          timeStr = timeStr.trim();
          if (!timeStr.includes(":")) {
            return isNaN(parseInt(timeStr, 10)) ? 0 : parseInt(timeStr, 10);
          }
          const [hours, minutes] = timeStr.split(":").map(Number);
          if (isNaN(hours) || isNaN(minutes)) {
            return 0;
          }
          return hours * 60 + minutes;
        }
        return null;
      },

      getDaysWithWeekdays: function (year, month) {
        var daysArray = [];
        var daysInMonth = new Date(year, month, 0).getDate(); // Get number of days in the month
        for (var day = 1; day <= daysInMonth; day++) {
          var date = new Date(year, month - 1, day); // JS months are 0-indexed
          var weekday = date.toLocaleString('en-US', { weekday: 'short' }); // Get weekday (e.g., Sun, Mon)
          daysArray.push(day + "\n" + weekday);
        }
        return daysArray;
      },

      resetColumnHeaders: function () {
        for (var i = 1; i <= 31; i++) {
          var columnId = "idDay" + i;
          var oColumnText = this.getView().byId(columnId);
          if (oColumnText) {
            oColumnText.setText(i.toString());
          }
        }
      },

      onPressSave: async function () {
        BusyIndicator.show(0);
        var response = await this.ajaxCreateWithJQuery("PayRoll", {
          data: JSON.stringify(this.oModel.getProperty("/TableData")),
        });
        if (response.success) {
          this.getView().byId("GS_id_BtnSave").setEnabled(false);
          this._onExportSalary();
          BusyIndicator.hide();
          MessageToast.show(this.i18nModel.getText("msgSalUploadSuccess"));
        } else {
          BusyIndicator.hide();
          try {
            if ((response.error.responseJSON.error).substring(0, 15) === "Duplicate entry") {
              this.getView().byId("GS_id_BtnSave").setEnabled(false);
              MessageToast.show(this.i18nModel.getText("msgDataExistsInDB"));
            }
            else {
              MessageToast.show(this.i18nModel.getText("msgSchemeDetailErrorSave"));
            }
          }
          catch (e) {
            MessageToast.show(this.i18nModel.getText("commanMessage"));
          }
        }
      },

      _onExportSalary: function () {
        var branch = this.oModel.getProperty("/FilterBranch");
        var month = this.oModel.getProperty("/FilterMonth");
        var year = this.oModel.getProperty("/FilterYear");
        const aData = this.oModel.getProperty("/TableData");
        var worksheet = XLSX.utils.json_to_sheet(aData);
        var workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${branch} Salary Data ${month}-${year}.xlsx`);
      }
    });
  }
);