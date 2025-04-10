sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "../utils/TraineeCertificatePDF",
  "../model/formatter"
], function (Controller, JSONModel, jsPDF, Formatter) {
  "use strict";

  return Controller.extend("sap.kt.ktofferletter.products.controller.BaseController", {
    Formatter: Formatter,
    // Router Code 
    getRouter: function () {
      return sap.ui.core.UIComponent.getRouterFor(this);
    },


    getI18nText: function (sKey, aParams) {
      const oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
      return oResourceBundle.getText(sKey, aParams);
    },

    calculateDateDifference: function (endDate, sStatus) {
      var thresholdDays = 30;
      if (!endDate) return "None";
      var parts = endDate.split('/');
      var day = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10) - 1;
      var year = parseInt(parts[2], 10);

      var endDateObj = new Date(year, month, day);

      var now = new Date();

      var timeDiff = endDateObj - now;
      var daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      if (daysDiff <= thresholdDays && sStatus === "Active") {
        return "Indication03";
      } else {
        return;
      }
    },

    commonLoginFunction: function (value) {
      var oModel = this.getOwnerComponent().getModel("loginModel");
      var TileModel = this.getView().getModel("modelTileVisible");
      if (value && TileModel) {
        if (value === "EmployeeOffer" && TileModel.getProperty("/GenerateEmployeeOffer") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Contract" && TileModel.getProperty("/GenerateContract") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "MSA&SOW" && TileModel.getProperty("/GenerateMsaNda") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Trainee" && TileModel.getProperty("/GenerateTraineeOffer") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Holiday" && TileModel.getProperty("/ListOfHolidays") === false) {
        } else if (value === "ApplyLeave" && TileModel.getProperty("/ApplyLeave") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "MyInbox" && TileModel.getProperty("/MyInbox") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Expense" && TileModel.getProperty("/ExpenseApp") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "CompanyInvoice" && TileModel.getProperty("/InvoiceApp") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "SelfService" && TileModel.getProperty("/SelfService") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Customer" && TileModel.getProperty("/AddCustomer") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "IDCard" && TileModel.getProperty("/IDCard") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "ConsultantInvoice" && TileModel.getProperty("/ConsultantInvoice") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "EmployeeDetails" && TileModel.getProperty("/EmployeeDetail") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Quotation" && TileModel.getProperty("/QuotationApp") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "AssigmentTask" && TileModel.getProperty("/AssignmentTask") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "AssigmentTask" && TileModel.getProperty("/AssignmentTask") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "PaySlip" && TileModel.getProperty("/PaySlip") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Timesheet" && TileModel.getProperty("/Timesheet") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "TimeSheetApproval" && TileModel.getProperty("/TimeSheetApproval") === false) {
          this.getRouter().navTo("RouteView1");
        }
      }

      if (!oModel) {
        this.getRouter().navTo("RouteView1");
        return;
      }
      var userId = oModel.getProperty("/userIds");
      var userName = oModel.getProperty("/userNames");
      if (!userId || !userName) {
        this.getRouter().navTo("RouteView1");
        return;
      }
    },

    _fetchCommonData: async function (entityName, modelName, filter = "") {
      let url = this.getOwnerComponent().getModel("LoginModel").getData().url + entityName;
      sap.ui.core.BusyIndicator.show(0);

      try {
        const data = await new Promise((resolve, reject) => {
          $.ajax({
            url: url,
            method: "GET",
            headers: this.getOwnerComponent().getModel("LoginModel").getData().headers,
            data: filter,
            success: function (data) {
              resolve(data);
            },
            error: function (err) {
              reject(err);
            }
          });
        });

        sap.ui.core.BusyIndicator.hide();
        if (data) {
          var oModel = new JSONModel(data.data);
          this.getOwnerComponent().setModel(oModel, modelName);
        }
      } catch (error) {
        sap.ui.core.BusyIndicator.hide();
        sap.m.MessageToast.show(error.responseJSON?.message || "Technical error, please contact the administrator");
      }
    },

    //Common read call for all the app
    async ajaxReadWithJQuery(sUrl, filter) {
      sap.ui.core.BusyIndicator.show(0);
      var queryString = new URLSearchParams(filter).toString();
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl + "?" + queryString,
          method: "GET",
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            sap.ui.core.BusyIndicator.hide();
            resolve(data);
          },
          error: function (error) {
            sap.ui.core.BusyIndicator.hide();
            reject(error);
          }
        });
      });
    },
    //Common create call for all the app
    async ajaxCreateWithJQuery(sUrl, oPayLoad) {
      sap.ui.core.BusyIndicator.show(0);
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "POST",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            sap.ui.core.BusyIndicator.hide();
            resolve(data);
          },
          error: function (error) {
            sap.ui.core.BusyIndicator.hide();
            reject(error);
          }
        });
      });
    },
    //Common update call for all the app
    async ajaxUpdateWithJQuery(sUrl, oPayLoad) {
      sap.ui.core.BusyIndicator.show(0);
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "PUT",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            sap.ui.core.BusyIndicator.hide();
            resolve(data);
          },
          error: function (error) {
            sap.ui.core.BusyIndicator.hide();
            reject(error);
          }
        });
      });
    },
    //Common delete call for all the app
    async ajaxDeleteWithJQuery(sUrl, oPayLoad) {
      sap.ui.core.BusyIndicator.show(0);
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "DELETE",
          contentType: "application/json",
          dataType: "json",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            sap.ui.core.BusyIndicator.hide();
            resolve(data);
          },
          error: function (error) {
            sap.ui.core.BusyIndicator.hide();
            reject(error);
          }
        });
      });
    },
    _calculateSalaryComponents: function (isTDSIncluded) {
      var oModel = this.getView().getModel("employeeModel");
      var CTC = parseFloat(oModel.getProperty("/CTC").replaceAll(",", ""));
      var joiningBonus = parseFloat(oModel.getProperty("/JoiningBonus").replaceAll(",", ""));
      var BasicSalary, TDS, PF = 0, EPF = 0;
      // Calculate various salary components
      BasicSalary = (CTC * 0.49) / 12;           // Monthly Basic Salary from 49% of CTC
      var houseRentAllowance = (CTC * 0.49) / 12 * 0.50;     // 50% of Basic Salary
      var StatutoryBonus = (CTC * 0.49) / 12 * 0.09575;   // 9.575% of Basic Salary
      var TotalMontly = BasicSalary + houseRentAllowance + StatutoryBonus;  // Total Monthly Salary
      var TotalmothlyAnnualized = TotalMontly * 12;   // Annualized Monthly Salary
      TDS = TotalMontly * 0.1 * 12;  // Annual TDS at 10% of Basic Salary

      var MedicalInsurance = BasicSalary * 0.4; // Medical Insurance at 40% of Basic
      var Gratuity = (BasicSalary * 15) / 26;    // Gratuity calculation
      var TotalRetires = TDS + MedicalInsurance + Gratuity;
      var PerformanceBonus = (CTC * 5) / 100;  //5% of CTC as PerformanceBonus
      var EngagementPB = (CTC * 5) / 100;   // 5% of CTC as EngagementPB
      var TotalVariablePay = PerformanceBonus + EngagementPB;
      var TotalDeduction = TDS + PF; // Total Deductions
      if (isTDSIncluded === "No TDS" || isTDSIncluded === "PF") {
        // PerformanceBonus += (TDS / 2)
        // EngagementPB += (TDS / 2);
        // TotalVariablePay = PerformanceBonus + EngagementPB
        TDS = 0; // Set TDS to 0 if not included
        PF = (BasicSalary * 0.13); // PF calculation
        EPF = (BasicSalary * 0.12);
        TotalRetires = EPF + MedicalInsurance + Gratuity;
        TotalDeduction = TDS + PF + EPF; // Total Deductions
        TotalMontly = TotalMontly - TotalDeduction;
        TotalmothlyAnnualized = TotalMontly * 12
      }
      var CostofCompany = TotalmothlyAnnualized + TotalRetires + TotalVariablePay;
      var Total = CostofCompany + parseInt(joiningBonus);
      // Set calculated values in the model with formatting
      oModel.setProperty("/BasicSalary", (Math.round(BasicSalary)));
      oModel.setProperty("/HRA", (Math.round(houseRentAllowance)));
      oModel.setProperty("/StatutoryBonus", (Math.round(StatutoryBonus)));
      oModel.setProperty("/TotalMonthly", (Math.round(TotalMontly)));
      oModel.setProperty("/TotalmothlyAnnualized", (Math.round(TotalmothlyAnnualized)));
      oModel.setProperty("/TDS", (Math.round(TDS)));
      oModel.setProperty("/MedicalInsurance", (Math.round(MedicalInsurance)));
      oModel.setProperty("/Gratuity", (Math.round(Gratuity)));
      oModel.setProperty("/TotalRetires", (Math.round(TotalRetires)));
      oModel.setProperty("/PerformanceBonus", (Math.round(PerformanceBonus)));
      oModel.setProperty("/EngagementPB", (Math.round(EngagementPB)));
      oModel.setProperty("/TotalVariablePay", (Math.round(TotalVariablePay)));
      oModel.setProperty("/CostofCompany", (Math.round(CostofCompany)));
      oModel.setProperty("/Total", (Math.round(Total)));
      oModel.setProperty("/PF", (Math.round(PF)));
      oModel.setProperty("/EPF", (Math.Round(EPF)));
    },

    //Date picker common function 
    _makeDatePickersReadOnly: function (aIds) {
      var oView = this.getView();
      aIds.forEach(function (sId) {
        var oDatePicker = oView.byId(sId);
        if (oDatePicker) {
          oDatePicker.addEventDelegate({
            onAfterRendering: function () {
              var datePickerDomRef = oDatePicker.getFocusDomRef();
              if (datePickerDomRef) {
                datePickerDomRef.readOnly = true;
                datePickerDomRef.style.cursor = 'pointer';
              }
            }
          });
        }
      });
    },

    //fragment date picker function
    _FragmentDatePickersReadOnly: function (aIds) {
      aIds.forEach(function (sId) {
        var oDatePicker = sap.ui.getCore().byId(sId);
        if (oDatePicker) {
          oDatePicker.addEventDelegate({
            onAfterRendering: function () {
              var datePickerDomRef = oDatePicker.getFocusDomRef();
              if (datePickerDomRef) {
                datePickerDomRef.readOnly = true;
                datePickerDomRef.style.cursor = 'pointer';
              }
            }
          });
        }
      });
    },

    _convertBLOBtoBASE64: function (buffer) {
      if (!buffer || buffer.byteLength === 0) {
        console.error("Invalid BLOB data.");
        return "";
      }

      var binary = '';
      var bytes = new Uint8Array(buffer);

      for (var i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }

      return btoa(binary); // Convert binary string to Base64
    },

    handleFileUpload: function (
      oEvent,
      oContext,
      sModelName,
      sAttachmentPath,
      sNamePath,
      sUploadFlagPath,
      sSuccessTextKey,
      sDuplicateTextKey,
      sNoFileKey,
      sErrorKey,
      fnValidateCallback
    ) {
      var that = this;
      const oFileUploader = oEvent.getSource();
      const oFiles = oFileUploader.oFileUpload.files;
      const oModel = oContext.getView().getModel(sModelName);

      // No file selected
      if (!oFiles.length) {
        sap.m.MessageToast.show(oContext.getI18nText(sNoFileKey));
        return;
      }

      let attachments = oModel.getProperty(sAttachmentPath) || [];
      let uploadedFileNames = oModel.getProperty(sNamePath)
        ? oModel.getProperty(sNamePath).split(", ")
        : [];

      Array.from(oFiles).forEach((oFile) => {
        if (uploadedFileNames.includes(oFile.name)) {
          sap.m.MessageToast.show(oContext.getI18nText(sDuplicateTextKey, [oFile.name]));
          return;
        }

        const oReader = new FileReader();

        oReader.onload = (e) => {
          const sFileBinary = e.target.result.split(",")[1];

          attachments.push({
            filename: oFile.name,
            contentType: oFile.type,
            content: sFileBinary,
            encoding: "base64"
          });

          oModel.setProperty(sAttachmentPath, attachments);
          oModel.setProperty(sUploadFlagPath, true);

          uploadedFileNames.push(oFile.name);
          oModel.setProperty(sNamePath, uploadedFileNames.join(", "));

          sap.m.MessageToast.show(oContext.getI18nText(sSuccessTextKey, [oFile.name]));

          // Re-validate button
          if (typeof fnValidateCallback === "function") {
            fnValidateCallback.call(oContext);
          }
        };

        oReader.onerror = () => {
          sap.m.MessageToast.show(oContext.getI18nText(sErrorKey, [oFile.name]));
        };

        oReader.readAsDataURL(oFile);
      });

      // Clear uploader for next selection
      oFileUploader.setValue("");
    },

    _waitForModels(modelNames, interval = 200, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkModels = () => {
          let allLoaded = modelNames.every(modelName => {
            let model = this.getView().getModel(modelName);
            return model && model.getData() && Object.keys(model.getData()).length > 0;
          });

          if (allLoaded) {
            resolve(); // ✅ Proceed when models have data
          } else if (Date.now() - startTime > timeout) {
            reject(new Error("Timeout waiting for models: " + modelNames.join(", ")));
          } else {
            setTimeout(checkModels, interval);
          }
        };

        checkModels();
      });
    },

    async generateCertificatePDF(content) {
      var oModel = this.getView().getModel("PDFData").getData();
      var oCoModel = this.getView().getModel("CompanyCodeDetailsModel");
      if (oCoModel) {
        oCoModel.destroy();
        this.getView().setModel(null, "CompanyCodeDetailsModel");
      }
      try {
        this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchcode: "KLB01" });
        await this._waitForModels(["CompanyCodeDetailsModel"], 200, 5000);

        sap.ui.core.BusyIndicator.show(0);
        var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
        if (!oCompanyDetailsModel || !oCompanyDetailsModel.companylogo) {
          MessageToast.show("Company Logo or Model not found.");
          return;
        }
        if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64) {
          var logoBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.companylogo?.data);
          var signBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.signature?.data);
          if (logoBase64 && signBase64) {
            oCompanyDetailsModel.companylogo64 = "data:image/png;base64," + logoBase64;
            oCompanyDetailsModel.signature64 = "data:image/png;base64," + signBase64;
          }
        }
        if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
          if (typeof jsPDF !== "undefined" && typeof jsPDF._GeneratePDF === "function") {
            jsPDF._GeneratePDF(content, oCompanyDetailsModel, oModel);
          } else {
            console.error("Error: jsPDF._GeneratePDF function not found.");
          }
        }
      } catch (error) {
        sap.ui.core.BusyIndicator.hide();
        sap.m.MessageToast.show("Error generating PDF: " + error.message);
        console.error("Error waiting for models:", error);
      }
    }
  })
});