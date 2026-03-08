sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "../model/formatter",
  "sap/ui/core/BusyIndicator",
  "sap/ui/unified/CalendarLegend",
  "sap/ui/unified/CalendarLegendItem",
  "sap/ui/unified/DateTypeRange"
], function (Controller, JSONModel, jsPDF, Formatter,
  BusyIndicator, CalendarLegend, CalendarLegendItem, DateTypeRange) {
  "use strict";

  return Controller.extend("sap.ui.com.project1.controller.BaseController", {
    Formatter: Formatter,
    // Router Code 

    //Common read call for all the app
    async ajaxReadWithJQuery(sUrl, filter) {
      const queryString = new URLSearchParams(filter).toString();
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getOwnerComponent().getModel("LoginModel").getData().url + sUrl + "?" + queryString,
          method: "GET",
          headers: this.getOwnerComponent().getModel("LoginModel").getData().headers,
          success: (data) => {
            resolve(data);
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    },

    // 1. Router access - completely safe
    getRouter: function () {
      return sap.ui.core.UIComponent.getRouterFor(this);
    },

    // 3. Navigation helper (optional, but consistent with other controllers)
    navTo: function (routeName, parameters, bReplace) {
      this.getRouter().navTo(routeName, parameters, bReplace);
    },

    // 4. Check if model exists helper (optional)
    getModel: function (sName) {
      return this.getView().getModel(sName);
    },

    // 5. Set model helper (optional)
    setModel: function (oModel, sName) {
      return this.getView().setModel(oModel, sName);
    },

    //Common create call for all the app
    async ajaxCreateWithJQuery(sUrl, oPayLoad) {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "POST",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
            reject(error);
          }
        });
      });
    },

    //Common update call for all the app
    async ajaxUpdateWithJQuery(sUrl, oPayLoad) {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "PUT",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
            reject(error);
          }
        });
      });
    },

    //Common delete call for all the app
    async ajaxDeleteWithJQuery(sUrl, oPayLoad) {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "DELETE",
          contentType: "application/json",
          dataType: "json",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
            reject(error);
          }
        });
      });
    },

    //fragment date picker function
    _FragmentDatePickersReadOnly: function (aIds) {
      aIds.forEach(function (sId) {
        var oDatePicker = sap.ui.getCore().byId(sId);
        if (oDatePicker) {
          oDatePicker.addEventDelegate({
            onAfterRendering: function () {
              var oInputDom = oDatePicker.getDomRef("inner");
              if (oInputDom) {
                oInputDom.setAttribute("readonly", true); // Prevent typing
                oInputDom.style.cursor = "pointer";
              }
            }
          }, oDatePicker);
          // Open calendar on click
          oDatePicker.attachBrowserEvent("click", function () {
            var oIconDomRef = oDatePicker.getDomRef("icon");
            if (oIconDomRef) {
              oIconDomRef.click(); // simulate icon click to open calendar
            }
          });
        }
      });
    },

    _ViewDatePickersReadOnly: function (aIds, oView) {
      aIds.forEach(function (sId) {
        var oDatePicker = oView.byId(sId);
        if (oDatePicker) {
          oDatePicker.addEventDelegate({
            onAfterRendering: function () {
              var oInputDom = oDatePicker.getDomRef("inner");
              if (oInputDom) {
                oInputDom.setAttribute("readonly", true); // Prevent typing
                oInputDom.style.cursor = "pointer";
              }
            }
          }, oDatePicker);
          // Open calendar on click
          oDatePicker.attachBrowserEvent("click", function () {
            var oIconDomRef = oDatePicker.getDomRef("icon");
            if (oIconDomRef) {
              oIconDomRef.click(); // simulate icon click to open calendar
            }
          });
        }
      });
    },

    getBusyDialog: function () {
      if (!this._pBusyDialog) {
        this._pBusyDialog = sap.ui.core.Fragment.load({
          name: "sap.ui.com.project1.fragment.BusyIndicator",
          controller: this
        }).then(function (oBusyDialog) {
          this.getView().addDependent(oBusyDialog);
          return oBusyDialog;
        }.bind(this));
      }

      this._pBusyDialog.then(function (oBusyDialog) {
        this.oBusyDialog = oBusyDialog;
        this.oBusyDialog.open();

      }.bind(this));
    },

    closeBusyDialog: function () {
      if (this.oBusyDialog) {
        this.oBusyDialog.close();
      }
    },

    _fetchCommonData: async function (entityName, modelName, filter = "") {
      if (modelName.split(" ")[1] === "TraineeFlag") {
        var flag = modelName.split(" ")[1]
        modelName = modelName.split(" ")[0];
      }
      if (!this.getOwnerComponent().getModel("LoginModel")) {
        BusyIndicator.hide();
        return;
      }
      let url = this.getOwnerComponent().getModel("LoginModel").getData().url + entityName;
      try {
        await new Promise((resolve, reject) => {
          $.ajax({
            url: url,
            method: "GET",
            headers: this.getOwnerComponent().getModel("LoginModel").getData().headers,
            data: filter,
            success: function (data) {
              if (data) {
                var oModel = new JSONModel(data.data);
                this.getOwnerComponent().setModel(oModel, modelName);
              }
              resolve(data);
              if (flag === "TraineeFlag") {
                this.closeBusyDialog();
              }
            }.bind(this),
            error: function (err) {
              reject(err);
            }
          });
        });

      } catch (error) {
        sap.m.MessageToast.show(error.responseJSON?.message || "Technical Error, Please Contact the Administrator");
      }
    },

    onClearAndSearch: function (sFilterBarId) {
      var oFilterBar = this.byId(sFilterBarId);
      if (oFilterBar) {
        oFilterBar.clear(); // Clear all filters in the FilterBar
      }
    },

    _carouselTimers: new Map(),

    /* Start auto-slide + interaction handling */
    _startAllCarouselsAutoSlide: function (iDelay = 3000) {
      try {
        const oView = this.getView();
        if (!oView) return;

        const aCarousels = oView.findAggregatedObjects(true, c => c?.isA("sap.m.Carousel"));

        aCarousels.forEach(carousel => {
          if (!carousel || carousel.bIsDestroyed) return;

          const pages = carousel.getPages();
          if (!pages || pages.length <= 1) return;

          /* Stop any old timers for this carousel */
          this._clearCarouselTimer(carousel.getId());

          /* Safe current index */
          let index = carousel.indexOfPage(carousel.getActivePage());

          /* Start interval autoplay */
          const autoTimer = setInterval(() => {
            if (carousel.bIsDestroyed) return;
            index = (index + 1) % pages.length;
            carousel.setActivePage(pages[index]);
          }, iDelay);

          this._carouselTimers.set(carousel.getId(), autoTimer);

          /* ------------ USER INTERACTION LOGIC ------------- */

          /* Pause immediately when user touches/clicks */
          const fnPause = () => {
            this._pauseCarouselAutoSlide(carousel);
            carousel._userTouched = true;
          };

          carousel.attachBrowserEvent("touchstart", fnPause);
          carousel.attachBrowserEvent("mousedown", fnPause);

          /* If the user swipes to the next image → resume after delay */
          if (carousel.onAfterSwipe) {
            const origSwipeFn = carousel.onAfterSwipe.bind(carousel);

            carousel.onAfterSwipe = (e) => {
              origSwipeFn?.(e);
              clearTimeout(carousel._resumeTimer);

              carousel._resumeTimer = setTimeout(() => {
                this._resumeCarouselAutoSlide(carousel, iDelay);
              }, 2000); // resume 2 sec after swipe
            };
          }

          /* If user just taps without swiping → resume later */
          const fnEnd = () => {
            clearTimeout(carousel._resumeTimer);
            carousel._resumeTimer = setTimeout(() => {
              this._resumeCarouselAutoSlide(carousel, iDelay);
            }, 3000); // resume after 3 sec idle
          };

          carousel.attachBrowserEvent("touchend", fnEnd);
          carousel.attachBrowserEvent("mouseup", fnEnd);

          /* ------------ END INTERACTION LOGIC ------------- */
        });

      } catch (err) {
        console.error("Auto Slide Error:", err);
      }
    },

    /* Stop autoplay for one carousel */
    _pauseCarouselAutoSlide: function (carousel) {
      const id = carousel.getId();
      if (this._carouselTimers.has(id)) {
        clearInterval(this._carouselTimers.get(id));
        this._carouselTimers.delete(id);
      }
    },

    /* Resume autoplay safely */
    _resumeCarouselAutoSlide: function (carousel, iDelay = 3000) {
      if (!carousel || carousel.bIsDestroyed) return;

      const pages = carousel.getPages();
      if (!pages || pages.length <= 1) return;

      let index = carousel.indexOfPage(carousel.getActivePage());

      const interval = setInterval(() => {
        if (carousel.bIsDestroyed) return;
        index = (index + 1) % pages.length;
        carousel.setActivePage(pages[index]);
      }, iDelay);

      this._carouselTimers.set(carousel.getId(), interval);
    },

    /* Kill all autoplay timers */
    _clearCarouselTimer: function (id) {
      if (this._carouselTimers.has(id)) {
        clearInterval(this._carouselTimers.get(id));
        this._carouselTimers.delete(id);
      }
    },

    _clearAllCarouselTimers: function () {
      this._carouselTimers.forEach(interval => clearInterval(interval));
      this._carouselTimers.clear();
    },

    /* Auto cleanup with View destruction */
    onExit: function () {
      this._clearAllCarouselTimers();
    },

    scrollToSection: function (pageId, sectionId) {
      var page = this.byId(pageId);
      if (page && sectionId) {
        page.scrollToSection(this.byId(sectionId).getId());
      }
    },

    //Date picker common function 
    _makeDatePickersReadOnly: function (aIds) {
      var oView = this.getView();
      aIds.forEach(function (sId) {
        var oControl = oView.byId(sId);
        if (oControl) {
          var bIsValueHelp = oControl.getMetadata().getName() === "sap.m.Input" && oControl.getShowValueHelp && oControl.getShowValueHelp();

          oControl.addEventDelegate({
            onAfterRendering: function () {
              var oDomRef = oControl.getDomRef("inner");
              if (oDomRef) {
                oDomRef.setAttribute("readonly", true); // block typing
                oDomRef.style.cursor = "pointer";
              }
            }
          }, oControl);

          oControl.attachBrowserEvent("click", function () {
            var oIcon = oControl.getDomRef("icon");
            if (oIcon) {
              oIcon.click(); // open calendar or value help
            }
          });

          // Optional: prevent typing via keypress too (extra safe)
          oControl.attachBrowserEvent("keydown", function (oEvent) {
            oEvent.preventDefault();
          });
        }
      });
    },

    convertNumberToWords: function (value, currency) {
      return new Promise((resolve, reject) => {
        if (typeof value !== 'number') {
          value = parseFloat(value);
          if (isNaN(value)) {
            return reject(new TypeError('The value must be a valid number.'));
          }
        }
        if (typeof currency !== 'string' || currency.trim() === '') {
          return reject(new TypeError('The currency code must be a non-empty string.'));
        }

        const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        const convertLessThanOneThousand = (num) => {
          let result = '';
          if (num >= 100) {
            result += units[Math.floor(num / 100)] + ' Hundred';
            num %= 100;
            if (num > 0) result += ' ';
          }
          if (num >= 20) {
            result += tens[Math.floor(num / 10)];
            num %= 10;
            if (num > 0) result += ' ';
          }
          if (num >= 10) {
            return result + teens[num - 10];
          }
          if (num > 0) {
            result += units[num];
          }
          return result.trim();
        };

        const toWordsIndian = (num) => {
          if (num === 0) return 'Zero';
          let words = '';
          const croreOfCrores = Math.floor(num / 100000000000000);
          if (croreOfCrores > 0) {
            words += toWordsIndian(croreOfCrores) + ' Crore ';
            num %= 100000000000000;
          }
          const lakhCrores = Math.floor(num / 1000000000000);
          if (lakhCrores > 0) {
            words += convertLessThanOneThousand(lakhCrores) + ' Lakh ';
            num %= 1000000000000;
          }
          const thousandCrores = Math.floor(num / 10000000000);
          if (thousandCrores > 0) {
            words += convertLessThanOneThousand(thousandCrores) + ' Thousand ';
            num %= 10000000000;
          }
          const crores = Math.floor(num / 10000000);
          if (crores > 0) {
            words += convertLessThanOneThousand(crores) + ' Crore ';
            num %= 10000000;
          }
          const lakhs = Math.floor(num / 100000);
          if (lakhs > 0) {
            words += convertLessThanOneThousand(lakhs) + ' Lakh ';
            num %= 100000;
          }
          const thousands = Math.floor(num / 1000);
          if (thousands > 0) {
            words += convertLessThanOneThousand(thousands) + ' Thousand ';
            num %= 1000;
          }
          if (num > 0) {
            words += convertLessThanOneThousand(num);
          }
          return words.trim();
        };

        const toWordsWestern = (num) => {
          if (num === 0) return 'Zero';
          let words = '';
          const quadrillions = Math.floor(num / 1000000000000000);
          if (quadrillions > 0) {
            words += toWordsWestern(quadrillions) + ' Quadrillion ';
            num %= 1000000000000;
          }
          const trillions = Math.floor(num / 1000000000000);
          if (trillions > 0) {
            words += toWordsWestern(trillions) + ' Trillion ';
            num %= 1000000000000;
          }
          const billions = Math.floor(num / 1000000000);
          if (billions > 0) {
            words += toWordsWestern(billions) + ' Billion ';
            num %= 1000000000;
          }
          const millions = Math.floor(num / 1000000);
          if (millions > 0) {
            words += convertLessThanOneThousand(millions) + ' Million ';
            num %= 1000000;
          }
          const thousands = Math.floor(num / 1000);
          if (thousands > 0) {
            words += convertLessThanOneThousand(thousands) + ' Thousand ';
            num %= 1000;
          }
          if (num > 0) {
            words += convertLessThanOneThousand(num);
          }
          return words.trim();
        };


        let currencyConfig = {
          majorSingular: 'Dollar',
          majorPlural: 'Dollars',
          minorSingular: 'Cent',
          minorPlural: 'Cents',
          system: 'Western'
        };

        const upperCurrency = currency.toUpperCase();

        if (upperCurrency === 'INR') {
          currencyConfig = {
            majorSingular: 'Rupee',
            majorPlural: 'Rupees',
            minorSingular: 'Paisa',
            minorPlural: 'Paise',
            system: 'Indian'
          };
        } else if (upperCurrency === 'AED') {
          currencyConfig = {
            majorSingular: 'Dirham',
            majorPlural: 'Dirhams',
            minorSingular: 'Fils',
            minorPlural: 'Fils',
            system: 'Western'
          };
        }

        const integerPart = Math.floor(value);
        const decimalPart = Math.round((value - integerPart) * 100);

        if (integerPart === 0 && decimalPart === 0) {
          return resolve(`Zero ${currencyConfig.majorPlural}`);
        }

        let integerWords = '';
        if (integerPart > 0) {
          if (currencyConfig.system === 'Indian') {
            integerWords = toWordsIndian(integerPart);
          } else {
            integerWords = toWordsWestern(integerPart);
          }
        }


        const majorUnit = integerPart === 1 ? currencyConfig.majorSingular : currencyConfig.majorPlural;
        let finalResult = integerPart > 0 ? `${integerWords} ${majorUnit}` : '';

        if (decimalPart > 0) {
          const decimalWords = convertLessThanOneThousand(decimalPart);
          const minorUnit = decimalPart === 1 ? currencyConfig.minorSingular : currencyConfig.minorPlural;
          if (finalResult) {
            finalResult += ` and ${decimalWords} ${minorUnit}`;
          } else {
            finalResult = `${decimalWords} ${minorUnit}`;
          }
        }

        resolve(finalResult.trim());
      });
    },

    getI18nText: function (sKey, aParams) {
      const oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
      return oResourceBundle.getText(sKey, aParams);
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
      const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20 MB

      // No file selected
      if (!oFiles.length) {
        sap.m.MessageToast.show(oContext.getI18nText(sNoFileKey));
        return;
      }

      let attachments = oModel.getProperty(sAttachmentPath) || [];
      let uploadedFileNames = oModel.getProperty(sNamePath)
        ? oModel.getProperty("/attachments").map((item) => item.filename)
        : [];
      let currentTotalSize = attachments.reduce((sum, file) => sum + file.size, 0);

      // Calculate total size including new files
      let newFilesTotalSize = Array.from(oFiles).reduce((sum, file) => sum + file.size, 0);
      let finalTotalSize = currentTotalSize + newFilesTotalSize;

      // Check total size constraint
      if (finalTotalSize > MAX_TOTAL_SIZE) {
        sap.m.MessageToast.show("Total File Size Should not Exceed 20 MB.");
        return;
      }

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
            fileType: oFile.name.split(".")[(oFile.name.split(".").length - 1)],
            content: sFileBinary,
            encoding: "base64",
            size: oFile.size // Store file size for future calculations
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

    onAttachmentsTableDelete: function (oEvent) {
      const oTableItem = oEvent.getParameter("listItem"); // the item being deleted
      const oTable = oEvent.getSource(); // the table

      // Get model
      const oModel = this.getView().getModel("UploaderData");
      const aItems = oModel.getProperty("/attachments");

      // Find the index of the deleted item
      const iIndex = oTable.indexOfItem(oTableItem);

      if (iIndex > -1) {
        aItems.splice(iIndex, 1); // remove 1 item at that index
        oModel.setProperty("/attachments", aItems); // update the model
      }
    },

    showConfirmationDialog: function (sTitle, sMessage, fnOnConfirm, fnOnCancel, sOkText, sCancelText) {
      var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

      var dialog = new sap.m.Dialog({
        title: sTitle,
        type: "Message",
        icon: "sap-icon://question-mark",
        content: new sap.m.Text({ text: sMessage }),
        beginButton: new sap.m.Button({
          text: sOkText || oResourceBundle.getText("OkButton"),
          type: "Transparent",
          press: function () {
            dialog.close();

            // this.getBusyDialog(); // open BusyDialog immediately
            Promise.resolve()
              .then(function () {
                if (typeof fnOnConfirm === "function") {
                  return fnOnConfirm();
                }
              }.bind(this))
              .finally(function () {
                // this.closeBusyDialog(); // Always close BusyDialog
              }.bind(this));
          }.bind(this)
        }),
        endButton: new sap.m.Button({
          text: sCancelText || oResourceBundle.getText("CancelButton"),
          type: "Transparent",
          press: function () {
            dialog.close();

            // this.getBusyDialog(); // open BusyDialog immediately
            Promise.resolve()
              .then(function () {
                if (typeof fnOnCancel === "function") {
                  return fnOnCancel();
                }
              }.bind(this))
              .finally(function () {
                // this.closeBusyDialog(); // Always close BusyDialog
              }.bind(this));
          }.bind(this)
        }),
        afterClose: function () {
          dialog.destroy();
        }
      });

      dialog.open();
    },

    CommonLogoutFunction: function () {
      var oLoginModel = this.getOwnerComponent().getModel("LoginModel");
      if (oLoginModel) {
        oLoginModel.setProperty("/EmployeeID", "");
        oLoginModel.setProperty("/UserID", "");
        oLoginModel.setProperty("/UserName", "");
        oLoginModel.setProperty("/EmployeeName", "");
        oLoginModel.setProperty("/Role", "");
        oLoginModel.setProperty("/BranchCode", "");
      }
      this.getOwnerComponent().getRouter().navTo("RouteHostel");
    },

    commonLoginFunction: function (value) {
      return new Promise((resolve) => {
        const oModel = this.getOwnerComponent().getModel("LoginModel");
        const TileModel = this.getView().getModel("TileVisibility");

        const fail = () => {
          this.closeBusyDialog()
          this.getOwnerComponent().getRouter().navTo("RouteHostel");
          resolve(false);
        };

        if (!oModel) return fail();

        const userId = oModel.getProperty("/EmployeeID");
        const userName = oModel.getProperty("/UserName");

        if (!userId || !userName) {
          return fail();
        }

        if (value && TileModel) {

          const tileMap = {
            "ManageCustomer": "/ManageCustomer",
            "ManageRooms": "/ManageRooms",
            "ManageBedType": "/ManageBedType",
            "ManageFacility": "/ManageFacility",
            "ManageBranch": "/ManageBranch",
            "ManageAmenities": "/ManageAmenities",
            "ManageInvoice": "/ManageInvoice",
            "ManageCoupon": "/ManageCoupon",
            "ManageStaff": "/ManageStaff",
            "ManageVendor": "/ManageVendor",
            "ManagePaymentDashboard": "/ManagePaymentDashboard",
            "ManageBookingDashboard": "/ManageBookingDashboard",
            "ManageSecurityDeposit": "/ManageSecurityDeposit",
            "ManagePaymentHistory": "/ManagePaymentHistory",
            "ManageCustomerReview": "/ManageCustomerReview",
            "ManageComplainDashboard": "/ManageComplainDashboard",
            "ManageDamage": "/ManageDamage",
            "DamageDashboard": "/DamageDashboard"
          };

          const modelPath = tileMap[value];

          if (modelPath && TileModel.getProperty(modelPath) === "0") {
            return fail();
          }
        }
        resolve(true);
      });
    },

    compressBase64: function (base64) {
      // Base64 → binary
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);

      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // gzip compress (browser)
      const compressed = window.pako.gzip(bytes);

      // compressed → Base64
      let compressedBinary = "";
      compressed.forEach(b => {
        compressedBinary += String.fromCharCode(b);
      });

      return btoa(compressedBinary);
    },

    decompressBase64: function (base64) {
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);

      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const decompressed = window.pako.ungzip(bytes);

      let resultBinary = "";
      decompressed.forEach(b => {
        resultBinary += String.fromCharCode(b);
      });

      return btoa(resultBinary);
    },
    // @BaseController.js

    // ─── TOUR: Public API ──────────────────────────────────────────────────────

    initUniversalTour: function (aSteps) {
      this._aTourSteps = (aSteps || []).slice();
      this._iTourIndex = 0;
      this._showTourStep(0);
    },

    // ─── TOUR: Core step renderer ─────────────────────────────────────────────

    _showTourStep: function (iIndex) {
      var that = this;
      var aSteps = this._aTourSteps;

      if (!aSteps || iIndex >= aSteps.length) {
        this._cleanupTour();
        return;
      }

      var oStepData = aSteps[iIndex];
      var oComponent = this.getOwnerComponent();

      if (!this._oGuideModel) {
        this._oGuideModel = oComponent.getModel("guideModel");
        if (!this._oGuideModel) {
          this._oGuideModel = new sap.ui.model.json.JSONModel();
          oComponent.setModel(this._oGuideModel, "guideModel");
        }
      }

      this._oGuideModel.setData({
        currentStep: {
          title: oStepData.title || "",
          description: oStepData.description || "",
          media: oStepData.media || "",
          stepText: "Step " + (iIndex + 1) + " of " + aSteps.length
        },
        isLast: iIndex === aSteps.length - 1
      });

      var oAnchor = this.getView().byId(oStepData.ui5Id);
      if (!oAnchor) {
        this.onNextTourStep();
        return;
      }

      var fnOpen = function () {
        if (!that._oGuidePopover) {
          that.loadFragment({
            name: "sap.ui.com.project1.fragment.GuidePopover"
          }).then(function (oPopover) {
            that._oGuidePopover = oPopover;

            // ✅ Escape key fix: Popover has no setEscapeHandler.
            // Intercept keydown on the popover's DOM instead.
            oPopover.addEventDelegate({
              onkeydown: function (oEvent) {
                if (oEvent.key === "Escape" || oEvent.keyCode === 27) {
                  oEvent.preventDefault();
                  oEvent.stopPropagation();
                  that._cleanupTour();  // cleans CSS + closes popover
                }
              }
            });

            that.getView().addDependent(oPopover);
            that._openStep(oPopover, oAnchor);
          });
        } else {
          that._openStep(that._oGuidePopover, oAnchor);
        }
      };

      if (!oAnchor.getDomRef()) {
        var oDelegate = {
          onAfterRendering: function () {
            oAnchor.removeEventDelegate(oDelegate);
            fnOpen();
          }
        };
        oAnchor.addEventDelegate(oDelegate);
      } else {
        fnOpen();
      }
    },

    // ─── TOUR: Open + position a step ────────────────────────────────────────

    _openStep: function (oPopover, oAnchor) {
      oPopover.setModel(this._oGuideModel, "guideModel");
      this._highlightElement(oAnchor);

      var oDomRef = oAnchor.getDomRef();
      if (oDomRef) {
        var oScrollNode = oDomRef.closest(".sapMPageScrollCont") || oDomRef.closest(".sapMScrollCont") || oDomRef.closest(".sapUiScrollDelegate");
        if (oScrollNode) {
          var nodeRect = oDomRef.getBoundingClientRect();
          var scrollRect = oScrollNode.getBoundingClientRect();
          // Scroll enough so the element is nicely visible without throwing the page off
          if (nodeRect.top < scrollRect.top || nodeRect.bottom > scrollRect.bottom) {
            var centerOffset = nodeRect.top - scrollRect.top - (scrollRect.height / 2) + (nodeRect.height / 2);
            oScrollNode.scrollBy({ top: centerOffset, behavior: "smooth" });
          }
        } else {
          oDomRef.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }
      }

      var vw = window.innerWidth || document.documentElement.clientWidth;

      if (vw < 600) {
        oPopover.setContentWidth("92%");
        oPopover.setPlacement(sap.m.PlacementType.Bottom);
        oPopover.setOffsetX(0);
        oPopover.setOffsetY(12);
        oPopover.openBy(oAnchor);
        return;
      }

      oPopover.setContentWidth("360px");
      oPopover.setPlacement(sap.m.PlacementType.Auto);
      oPopover.setOffsetX(0);
      oPopover.setOffsetY(0);
      oPopover.openBy(oAnchor);

      requestAnimationFrame(function () {
        var popDom = oPopover.getDomRef();
        var ph = popDom ? popDom.offsetHeight : 220;
        var sBest = this._getBestPlacement(oAnchor, 360, ph);
        var GAP = 10;

        oPopover.setPlacement(sBest);

        // Valid PlacementType values: Right, Left, Top, Bottom, Auto
        if (sBest === sap.m.PlacementType.Right) { oPopover.setOffsetX(GAP); oPopover.setOffsetY(0); }
        else if (sBest === sap.m.PlacementType.Left) { oPopover.setOffsetX(-GAP); oPopover.setOffsetY(0); }
        else if (sBest === sap.m.PlacementType.Bottom) { oPopover.setOffsetX(0); oPopover.setOffsetY(GAP); }
        else if (sBest === sap.m.PlacementType.Top) { oPopover.setOffsetX(0); oPopover.setOffsetY(-GAP); }
        else { oPopover.setOffsetX(0); oPopover.setOffsetY(0); }

        oPopover.openBy(oAnchor);
      }.bind(this));
    },

    // ─── TOUR: Placement algorithm ────────────────────────────────────────────

    _getBestPlacement: function (oAnchor, pw, ph) {
      var oDom = oAnchor && oAnchor.getDomRef && oAnchor.getDomRef();
      if (!oDom) return sap.m.PlacementType.Auto;

      var vw = window.innerWidth || document.documentElement.clientWidth;
      var vh = window.innerHeight || document.documentElement.clientHeight;

      if (vw < 600) return sap.m.PlacementType.Bottom;

      var r = oDom.getBoundingClientRect();
      var margin = 16;

      var spaceRight = vw - r.right;
      var spaceLeft = r.left;
      var spaceBottom = vh - r.bottom;
      var spaceTop = r.top;

      if (spaceRight >= pw + margin) return sap.m.PlacementType.Right;
      if (spaceLeft >= pw + margin) return sap.m.PlacementType.Left;
      if (spaceBottom >= ph + margin) return sap.m.PlacementType.Bottom;
      if (spaceTop >= ph + margin) return sap.m.PlacementType.Top;

      return sap.m.PlacementType.Auto;
    },

    // ─── TOUR: Highlight ──────────────────────────────────────────────────────

    _highlightElement: function (oControl) {
      // Clear previous highlight (vanilla, no jQuery dependency)
      document.querySelectorAll(".sapUiTourHighlight").forEach(function (el) {
        el.classList.remove("sapUiTourHighlight");
      });

      var oDomRef = oControl.getDomRef();
      if (oDomRef) {
        document.body.classList.add("sapUiTourOverlayActive");
        oDomRef.classList.add("sapUiTourHighlight");
      }
    },

    // ─── TOUR: Cleanup ────────────────────────────────────────────────────────

    _cleanupTour: function () {
      document.body.classList.remove("sapUiTourOverlayActive");
      document.querySelectorAll(".sapUiTourHighlight").forEach(function (el) {
        el.classList.remove("sapUiTourHighlight");
      });

      this._iTourIndex = 0;
      this._aTourSteps = [];

      if (this._oGuidePopover && this._oGuidePopover.isOpen()) {
        this._oGuidePopover.close();
      }
    },

    // ─── TOUR: Button handlers ────────────────────────────────────────────────

    onNextTourStep: function () {
      this._iTourIndex = (this._iTourIndex || 0) + 1;

      if (this._iTourIndex >= this._aTourSteps.length) {
        this._cleanupTour();
        return;
      }

      this._showTourStep(this._iTourIndex);
    },

    onSkipTour: function () {
      this._cleanupTour();
    },

    // Prevents backdrop-tap / outside-click from silently closing the popover
    // without cleaning up CSS. Escape is handled via setEscapeHandler above.
    onBeforePopoverClose: function (oEvent) {
      var sReason = oEvent.getParameter("reason");

      // Allow close only when WE triggered it (ClosedByAPI = our _cleanupTour call)
      if (sReason !== "ClosedByAPI" && this._aTourSteps && this._aTourSteps.length > 0) {
        oEvent.preventDefault();
      }
    },
  })
});