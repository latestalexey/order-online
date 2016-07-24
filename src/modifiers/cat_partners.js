/**
 * ### Дополнительные методы справочника _Контрагенты_
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 * @module cat_partners
 */

$p.modifiers.push(
	function($p){

		var _mgr = $p.cat.partners;

		/**
		 * ### Запрос поиска по строке
		 *
		 * @method sql_selection_where_flds
		 * @override
		 * @param filter
		 * @returns {string}
		 */
		_mgr.sql_selection_where_flds = function(filter){
			return " OR inn LIKE '" + filter + "' OR name_full LIKE '" + filter + "' OR name LIKE '" + filter + "'";
		};


		_mgr._obj_constructor.prototype.__define({

			/**
			 * ### Адрес контрагента
			 * Вспомогательное свойство, например, для печатных форм. Ищет адрес в табчасти контактной информации
			 * TODO: в старых конфигурациях 1С, у контрагентов и организаций нет табчасти _КонтактнаяИнформация_ в обработчике перед выгрузкой объекта нужно сформировать виртуальную табличную часть из регистра сведений _КонтактнаяИнформация_
			 */
			addr: {
				get: function () {

					return this.contact_information._obj.reduce(function (val, row) {

						if(row.kind == $p.cat.contact_information_kinds.predefined("ЮрАдресКонтрагента") && row.presentation)
							return row.presentation;

						else if(val)
							return val;

						else if(row.presentation && (
								row.kind == $p.cat.contact_information_kinds.predefined("ФактАдресКонтрагента") ||
								row.kind == $p.cat.contact_information_kinds.predefined("ПочтовыйАдресКонтрагента")
							))
							return row.presentation;

					}, "")

				}
			},

			/**
			 * ### Телефон контрагента
			 * Вспомогательное свойство, например, для печатных форм. Ищет телефон в табчасти контактной информации
			 * TODO: в старых конфигурациях 1С, у контрагентов и организаций нет табчасти _КонтактнаяИнформация_ в обработчике перед выгрузкой объекта нужно сформировать виртуальную табличную часть из регистра сведений _КонтактнаяИнформация_
			 */
			phone: {
				get: function () {

					return this.contact_information._obj.reduce(function (val, row) {

						if(row.kind == $p.cat.contact_information_kinds.predefined("ТелефонКонтрагента") && row.presentation)
							return row.presentation;

						else if(val)
							return val;

						else if(row.kind == $p.cat.contact_information_kinds.predefined("ТелефонКонтрагентаМобильный") && row.presentation)
							return row.presentation;

					}, "")
				}
			},

			/**
			 * ### полное наименование
			 * с телефоном, адресом и банковским счетом
			 */
			long_presentation: {
				get: function () {
					var res = this.name_full || this.name,
						addr = this.addr,
						phone = this.phone;

					if(this.inn)
						res+= ", ИНН" + this.inn;

					if(this.kpp)
						res+= ", КПП" + this.kpp;
					
					if(addr)
						res+= ", " + addr;

					if(phone)
						res+= ", " + phone;
					
					return res;
				}
			}
		});


	}
);